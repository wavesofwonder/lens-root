// Application constants
const DEFAULT_AVATAR = 'assets/default-avatar.png';
const WORKER_URL = 'https://lens-proxy.qtroad.workers.dev/api/proxy';


// DOM Elements
let profileImage, handleElement, bioElement, followersCount, followingCount, postsCount, postsSection, loadingIndicator;

// Initialize the app after config is loaded and DOM is ready
function initializeApp() {
  try {
    console.log('initializeApp() called');
    console.log('Current window.lensConfig:', window.lensConfig);
    
    if (!window.lensConfig) {
      throw new Error('lensConfig is not defined');
    }
    
    if (!window.lensConfig.lensName) {
      throw new Error('lensConfig.lensName is not defined');
    }
    
    // Set up DOM elements
    console.log('Setting up DOM elements...');
    profileImage = document.getElementById('profileImage');
    handleElement = document.getElementById('handle');
    bioElement = document.getElementById('bio');
    followersCount = document.getElementById('followersCount');
    followingCount = document.getElementById('followingCount');
    postsCount = document.getElementById('postsCount');
    postsSection = document.getElementById('postsSection');
    
    // Set up loading indicator
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div><p>Loading...</p>';

    // Get handle from URL or use default from config
    const urlParams = new URLSearchParams(window.location.search);
    const handleFromUrl = urlParams.get('handle');
    const defaultHandle = `${window.lensConfig.lensName}.lens`;
    const handle = handleFromUrl || defaultHandle;
    
    console.log('Using handle:', handle, '(from URL:', handleFromUrl, ', default:', defaultHandle, ')');
    
    // Return the handle to be used for fetching profile data
    return handle;
  } catch (error) {
    console.error('Error in initializeApp:', error);
    hideLoading();
    alert('Error initializing application: ' + error.message);
    throw error; // Re-throw to be caught by the caller
  }
}

// Function to show loading state
function showLoading() {
  if (loadingIndicator && document.body) {
    document.body.appendChild(loadingIndicator);
  }
}

// Function to hide loading state
function hideLoading() {
  if (loadingIndicator && loadingIndicator.parentNode) {
    loadingIndicator.remove();
  }
}

console.log('Starting app initialization...');

// Show loading state immediately
showLoading();

// Load config and initialize app
function loadApp() {
  console.log('Loading config.json...');
  
  // First, check if config is already loaded (e.g., in development)
  if (window.lensConfig) {
    console.log('Using existing window.lensConfig:', window.lensConfig);
    initializeWithConfig(window.lensConfig);
    return;
  }

  // Otherwise, fetch the config file
  fetch('config.json')
    .then(response => {
      console.log('Config fetch response received, status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to load config.json: HTTP ${response.status}`);
      }
      return response.json().catch(e => {
        throw new Error('Failed to parse config.json: ' + e.message);
      });
    })
    .then(config => {
      console.log('Config parsed successfully:', config);
      initializeWithConfig(config);
    })
    .catch(error => {
      console.error('Error loading config:', error);
      hideLoading();
      alert('Error loading configuration: ' + error.message);
    });
    
  function initializeWithConfig(config) {
    try {
      // Validate required config
      console.log('Validating config...');
      if (!config) {
        throw new Error('Config is null or undefined');
      }
      if (!config.lensName) {
        throw new Error('config.json is missing required field: lensName');
      }
      if (!config.namespace) {
        throw new Error('config.json is missing required field: namespace');
      }
      if (!config.evmAddress) {
        throw new Error('config.json is missing required field: evmAddress');
      }

      // Set config values
      console.log('Config validation successful, setting window.lensConfig');
      window.lensConfig = config;
      LENS_API_URL = config.lensApiUrl || 'https://api-v2.lens.dev';
      
      console.log('Calling initializeApp()...');
      // Initialize the app and get the handle
      const handle = initializeApp();
      
      // Only fetch profile data if initialization was successful
      if (handle) {
        console.log('Initialization successful, calling fetchProfileData...');
        fetchProfileData(handle).catch(error => {
          console.error('Error in fetchProfileData:', error);
          hideLoading();
          alert('Error loading profile data: ' + error.message);
        });
      }
    } catch (error) {
      console.error('Error initializing with config:', error);
      hideLoading();
      alert('Error initializing application: ' + error.message);
    }
  }
}

console.log('Initial script execution - checking DOM ready state...');
console.log('Current document.readyState:', document.readyState);

// Start loading when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM already ready, calling loadApp()');
  loadApp();
} else {
  console.log('Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired, calling loadApp()');
    loadApp();
  });
}

// Function to fetch profile data from Lens Chain
async function fetchProfileData(handle) {
    try {
        showLoading();
        
        // First query for account data
        const accountQuery = `
          query Profile($request: AccountRequest!) {
            account(request: $request) {
              id
              address
              username {
                value
              }
              metadata {
                name
                bio
                picture
                coverPicture
              }
            }
          }`;

        // Second query for stats
        const statsQuery = `query AccountStats($request: AccountStatsRequest!) {
            accountStats(request: $request) {
                feedStats {
                    posts
                    comments
                    reposts
                    quotes
                    reactions
                    collects
                }
                graphFollowStats {
                    followers
                    following
                }
            }
        }`;

        // Make request for account data
        const accountResponse = await fetch(`${WORKER_URL}/accounts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: accountQuery,
              variables: {
                request: {
                  username: {
                    localName: window.lensConfig.lensName,
                    namespace: window.lensConfig.namespace
                  }
                }
              }
            })
          });

        if (!accountResponse.ok) {
            const errorData = await accountResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${accountResponse.status}`);
        }
        
        const accountData = await accountResponse.json();
        console.log('Raw account data:', JSON.stringify(accountData, null, 2));
        
        // Debug the account data structure
        if (accountData.data?.account) {
            console.log('Account object:', accountData.data.account);
            console.log('Metadata:', accountData.data.account.metadata);
            console.log('Cover picture from response:', accountData.data.account.metadata?.coverPicture);
        }

        if (!accountData.data || !accountData.data.account) {
            throw new Error('Account not found');
        }

        const account = accountData.data.account;

        // Make request for stats data using account address
        const statsResponse = await fetch(`${WORKER_URL}/stats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: statsQuery,
              variables: {
                address: account.address
              }
            })
          });

        if (!statsResponse.ok) {
            const errorData = await statsResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${statsResponse.status}`);
        }
        
        const statsData = await statsResponse.json();
        console.log('Received stats data:', statsData);

        let stats = null;
        if (statsData.data && statsData.data.accountStats) {
            stats = statsData.data.accountStats;
        }

        updateProfileUI(account, stats);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        alert('Error loading profile: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Function to update UI with profile data
function updateProfileUI(account, stats) {
    console.log('Updating UI with account:', JSON.stringify(account, null, 2));
    console.log('Account metadata:', account.metadata);
    
    // Update hero section
    const hero = document.querySelector('header.hero');
    const heroName = document.getElementById('heroName');
    const heroTagline = document.getElementById('heroTagline');
    const displayName = account.metadata?.name || account.username?.value || 'Profile Name';
    
    // Set hero background image if cover picture exists
    const coverPicture = account.metadata?.coverPicture;
    console.log('Cover picture URL:', coverPicture);
    
    if (coverPicture) {
        console.log('Setting cover image URL:', coverPicture);
        hero.style.backgroundImage = `url('${coverPicture}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
        hero.style.backgroundRepeat = 'no-repeat';
    } else {
        console.log('No cover picture found, using black background');
        hero.style.background = 'black';
    }
    
    if (heroName) heroName.textContent = displayName;
    if (heroTagline) {
        heroTagline.innerHTML = account.metadata?.bio 
            ? account.metadata.bio.replace(/\n/g, '<br>') 
            : `@${account.username?.value || ''}`;
    }
    // Handle profile picture
    const profilePicture = account.metadata?.picture;
    if (profilePicture) {
        console.log('Setting profile picture URL:', profilePicture);
        profileImage.src = profilePicture;
    } else {
        console.log('Using default avatar');
        profileImage.src = DEFAULT_AVATAR;
    }

    // Update stats
    const feedStats = stats?.feedStats || {};
    const graphStats = stats?.graphFollowStats || {};
    
    followersCount.textContent = graphStats.followers || 0;
    followingCount.textContent = graphStats.following || 0;
    postsCount.textContent = feedStats.posts || 0;  

    // Load posts
    loadPosts(account.id);
}

// Function to load and display posts
async function loadPosts(profileId) {
    try {
        showLoading();
        
        // GraphQL query with fragments
        const query = `
            fragment Post on Post {
                id
                author {
                    ...Account
                }
                timestamp
                app {
                    metadata {
                        name
                        logo
                    }
                }
                metadata {
                    __typename
                    ... on TextOnlyMetadata {
                        content
                    }
                    ... on ArticleMetadata {
                        title
                        content
                        attributes {
                            key
                            value
                        }
                    }
                }
                stats {
                    comments
                    collects
                }
            }


            fragment Account on Account {
                username {
                    value
                }
                metadata {
                    name
                    picture
                }
            }


            fragment Repost on Repost {
                id
                author {
                    ...Account
                }
                timestamp
                app {
                    metadata {
                        name
                        logo
                    }
                }
                repostOf {
                    ...Post
                }
            }


            query {
                posts(
                    request: {
                        filter: {
                            authors: ["${window.lensConfig.evmAddress}"]
                        }
                    }
                ) {
                    items {
                        ... on Post {
                            ...Post
                        }
                        ... on Repost {
                            ...Repost
                        }
                    }
                    pageInfo {
                        prev
                        next
                    }
                }
            }
        `;

        console.log('Sending posts query for address:', window.lensConfig.evmAddress);
        
        const response = await fetch(`${WORKER_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: {}
            })
        });
        
        const data = await response.json();
        console.log('Received posts response:', data);
        
        if (!data || !data.data || !data.data.posts || !data.data.posts.items) {
            throw new Error('No posts found');
        }
        
        const combinedItems = [];

        // Normalize structure to a shared shape
        data.data.posts.items.forEach(item => {
            if (item.repostOf && item.repostOf.metadata) {
                combinedItems.push({
                    type: 'Repost',
                    id: item.id,
                    timestamp: item.timestamp,
                    repostedBy: item.author,
                    originalPost: item.repostOf
                });
            } else if (item.metadata) {
                combinedItems.push({
                    type: 'Post',
                    ...item
                });
            } else {
                console.warn('Skipping malformed item:', item);
            }
        });

        // Sort all posts chronologically (newest first)
        combinedItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const postsList = document.querySelector('.posts-list');
        postsList.innerHTML = '';

        // Render in order
        combinedItems.forEach(item => {
            if (item.type === 'Repost') {
                renderRepost(item, postsList);
            } else {
                renderPost(item, postsList);
            }
        });

    } catch (error) {
        console.error('Error loading posts:', error);
        alert('Error loading posts: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Helper to extract media info from post metadata
function extractMedia(metadata) {
    if (!metadata || !metadata.__typename) return null;
    if (metadata.__typename === 'ImageMetadata') {
        return {
            type: 'image',
            url: metadata.image?.original?.url || '',
            cover: '',
            duration: '',
            artist: '',
            genre: '',
            credits: ''
        };
    }
    if (metadata.__typename === 'VideoMetadata') {
        return {
            type: 'video',
            url: metadata.video?.item || '',
            cover: metadata.video?.cover || '',
            duration: metadata.video?.duration || '',
            artist: '',
            genre: '',
            credits: ''
        };
    }
    if (metadata.__typename === 'AudioMetadata') {
        return {
            type: 'audio',
            url: metadata.audio?.item || '',
            cover: metadata.audio?.cover || '',
            duration: metadata.audio?.duration || '',
            artist: metadata.audio?.artist || '',
            genre: metadata.audio?.genre || '',
            credits: metadata.audio?.credits || ''
        };
    }
    return null;
}

// Helper to format timestamps
function formatTimestamp(ts) {
    if (!ts) return { str: '', isRelative: false };
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return { str: `${diffSec}s ago`, isRelative: true };
    if (diffMin < 60) return { str: `${diffMin}m ago`, isRelative: true };
    if (diffHr < 24) return { str: `${diffHr}h ago`, isRelative: true };
    if (diffDay < 7) return { str: `${diffDay}d ago`, isRelative: true };
    // Else: show full date
    return { str: date.toLocaleString(), isRelative: false };
}

// Helper to get post content with graceful fallbacks
function getPostContent(metadata) {
    if (!metadata) return 'No content available';
    // Handle ArticleMetadata specifically
    if (metadata.__typename === 'ArticleMetadata') {
        return metadata.content || 'Article content not available';
    }
    if (metadata.content) return metadata.content;
    if (metadata.description) return metadata.description;
    if (metadata.name) return metadata.name;
    return 'No content available';
}

// Function to render a regular post
function renderPost(post, postsList) {
    if (!post) {
        console.warn('Skipping invalid post:', post);
        return;
    }
    
    const postCard = document.createElement('div');
    postCard.className = 'post-card';

    // Create content container
    const contentEl = document.createElement('div');
    
    // Handle ArticleMetadata
    if (post.metadata?.__typename === 'ArticleMetadata') {
        console.log('Rendering ArticleMetadata:', post.metadata);
        const { title, attributes = [] } = post.metadata;
        const attrMap = Object.fromEntries(attributes.map(a => [a.key, a.value]));
        
        // Create article wrapper first
        const articleWrapper = document.createElement('div');
        articleWrapper.className = 'article-wrapper';
        
        // Add the content element to the post card first
        contentEl.className = 'post-content article-content';
        postCard.appendChild(contentEl);
        
        // We'll keep the cover image in the content flow
        const coverUrl = attrMap.coverUrl; // Store the cover URL for reference
        
        // Add title and subtitle
        if (title) {
            const titleEl = document.createElement('h2');
            titleEl.className = 'article-title';
            titleEl.textContent = title;
            articleWrapper.appendChild(titleEl);
        }
        
        if (attrMap.subtitle) {
            const subtitleEl = document.createElement('h3');
            subtitleEl.className = 'article-subtitle';
            subtitleEl.textContent = attrMap.subtitle;
            articleWrapper.appendChild(subtitleEl);
        }
        
        // Process content from contentJson attribute
        if (attrMap.contentJson) {
            try {
                const contentBlocks = JSON.parse(attrMap.contentJson);
                if (Array.isArray(contentBlocks)) {
                    const articleBody = document.createElement('div');
                    articleBody.className = 'article-body';
                    
                    contentBlocks.forEach(block => {
                        if (!block) return;
                        
                        try {
                            switch (block.type) {
                                case 'title':
                                case 'subtitle':
                                    // Skip as we already handled these
                                    break;
                                    
                                case 'img':
                                    // Handle all images in the content
                                    if (block.url) {
                                        const isCoverImage = coverUrl && block.url.includes(coverUrl.split('/').pop());
                                        const containerClass = isCoverImage ? 'article-cover' : `article-image ${block.width === 'wide' ? 'wide-image' : ''}`;
                                        
                                        const imgContainer = document.createElement('div');
                                        imgContainer.className = containerClass;
                                        
                                        const img = document.createElement('img');
                                        img.src = block.url;
                                        img.alt = block.alt || (isCoverImage ? (title || 'Article cover') : '');
                                        img.className = isCoverImage ? 'article-cover-image' : '';
                                        imgContainer.appendChild(img);
                                        
                                        if (block.caption) {
                                            const caption = document.createElement('div');
                                            caption.className = 'image-caption';
                                            caption.textContent = block.caption;
                                            imgContainer.appendChild(caption);
                                        }
                                        
                                        articleBody.appendChild(imgContainer);
                                    }
                                    break;
                                    
                                case 'p':
                                case 'paragraph':
                                    const text = block.children?.map(child => child?.text || '').join('').trim();
                                    if (text) {
                                        const p = document.createElement('p');
                                        p.textContent = text;
                                        articleBody.appendChild(p);
                                    }
                                    break;
                                    
                                case 'h1':
                                case 'h2':
                                case 'h3':
                                case 'h4':
                                case 'h5':
                                case 'h6':
                                    const headingText = block.children?.map(child => child?.text || '').join('').trim();
                                    if (headingText) {
                                        const heading = document.createElement(block.type);
                                        heading.textContent = headingText;
                                        articleBody.appendChild(heading);
                                    }
                                    break;
                                    
                                case 'ul':
                                case 'ol':
                                    if (block.children?.length) {
                                        const list = document.createElement(block.type);
                                        list.className = `article-${block.type}`;
                                        
                                        block.children.forEach(li => {
                                            if (li?.children?.length) {
                                                const liText = li.children.map(child => child?.text || '').join('').trim();
                                                if (liText) {
                                                    const liEl = document.createElement('li');
                                                    liEl.textContent = liText;
                                                    list.appendChild(liEl);
                                                }
                                            }
                                        });
                                        
                                        if (list.children.length > 0) {
                                            articleBody.appendChild(list);
                                        }
                                    }
                                    break;
                                    
                                default:
                                    console.log('Unhandled block type:', block.type, block);
                            }
                        } catch (blockError) {
                            console.error('Error rendering block:', block, blockError);
                        }
                    });
                    
                    if (articleBody.children.length > 0) {
                        articleWrapper.appendChild(articleBody);
                    }
                }
            } catch (e) {
                console.error('Error parsing contentJson:', e);
                if (post.metadata.content) {
                    const fallbackContent = document.createElement('div');
                    fallbackContent.className = 'article-body';
                    fallbackContent.textContent = post.metadata.content;
                    articleWrapper.appendChild(fallbackContent);
                }
            }
        } else if (post.metadata.content) {
            // Fallback to plain content if no contentJson
            const fallbackContent = document.createElement('div');
            fallbackContent.className = 'article-body';
            fallbackContent.textContent = post.metadata.content;
            articleWrapper.appendChild(fallbackContent);
        }
        
        // Only append the wrapper if it has content
        if (articleWrapper.children.length > 0) {
            contentEl.appendChild(articleWrapper);
        } else {
            // If no content, ensure we still have the content element
            contentEl.textContent = 'No content available';
        }
    } else {
        // Original text post rendering
        contentEl.className = 'post-content';
        let contentHtml = '';
        if (post.metadata?.title) {
            contentHtml += `<h3 class="post-title">${post.metadata.title}</h3>`;
        }
        contentHtml += `<p>${getPostContent(post.metadata)}</p>`;
        contentEl.innerHTML = contentHtml;
    }
    
    // Append the content element to the post card
    postCard.appendChild(contentEl);
    
    // Media
    const media = extractMedia(post.metadata);
    if (media && media.url) {
        const mediaEl = document.createElement('div');
        mediaEl.className = 'post-media';
        if (media.type === 'image') {
            mediaEl.innerHTML = `<img src="${media.url}" alt="Post image" class="post-image">`;
        } else if (media.type === 'video') {
            mediaEl.innerHTML = `
                <video controls class="post-video" ${media.cover ? `poster='${media.cover}'` : ''}>
                    <source src="${media.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                ${media.duration ? `<div class="video-duration">${media.duration}</div>` : ''}
            `;
        } else if (media.type === 'audio') {
            mediaEl.innerHTML = `
                <audio controls class="post-audio">
                    <source src="${media.url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                ${media.cover ? `<div class="audio-cover" style="background-image:url('${media.cover}')"></div>` : ''}
                <div class="audio-info">
                    ${media.artist ? `<div class="audio-artist">${media.artist}</div>` : ''}
                    ${media.genre ? `<div class="audio-genre">${media.genre}</div>` : ''}
                    ${media.credits ? `<div class="audio-credits">${media.credits}</div>` : ''}
                    ${media.duration ? `<div class="audio-duration">${media.duration}</div>` : ''}
                </div>
            `;
        }
        postCard.appendChild(mediaEl);
    }

    // Post stats + app icon and date
    const statsEl = document.createElement('div');
    statsEl.className = 'post-stats';
    let appLogoHtml = '';
    if (post.app?.metadata?.logo) {
        const appUrl = post.app?.metadata?.url || null;
        const logoImg = `<img src="${post.app.metadata.logo}" alt="${post.app.metadata.name || 'App'}" class="app-logo" style="vertical-align:middle;">`;
        appLogoHtml = appUrl ? `<a href="${appUrl}" target="_blank" rel="noopener">${logoImg}</a>` : logoImg;
    }
    const tsObj = formatTimestamp(post.timestamp);
    let postedViaText = appLogoHtml
        ? `via ${appLogoHtml}${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`
        : `${tsObj.isRelative ? '' : 'on '}${tsObj.str}`;
    const authorName = post.author.metadata?.name || post.author.username?.value || 'Unknown';
    const authorAvatar = post.author.metadata?.picture || DEFAULT_AVATAR;
    statsEl.innerHTML = `
        <span class="stat">❤️ ${post.stats?.totalUpvotes || 0}</span>
        <span class="stat">💬 ${post.stats?.comments || 0}</span>
        <span class="stat">🔁 ${post.stats?.totalAmountOfMirrors || 0}</span>
        <span class="stat">🔄 ${post.stats?.totalAmountOfCollects || 0}</span>
        <span class="stat posted-via">Posted by ${authorName} <img src="${authorAvatar}" alt="${authorName}" class="author-avatar-small"> ${postedViaText}</span>
    `;
    
    // Assemble the post card
    postCard.appendChild(contentEl);
    postCard.appendChild(statsEl);
    
    // Add to the posts list
    postsList.appendChild(postCard);
}

// Function to render a repost
function renderRepost(repost, postsList) {
    if (!repost || !repost.originalPost) {
        console.warn('Skipping invalid repost:', repost);
        return;
    }
    
    const { originalPost, repostedBy } = repost;
    
    const postCard = document.createElement('div');
    postCard.className = 'post-card repost';
    
    // Repost header
    const repostHeader = document.createElement('div');
    repostHeader.className = 'repost-header';
    repostHeader.innerHTML = `
        <span class="repost-icon">♻️</span>
        <span class="repost-text">Reposted by ${repostedBy.metadata?.name || repostedBy.username?.value || 'Someone'}</span>
    `;
    
    // Original post content (without header, will be in stats line)
    const originalPostEl = document.createElement('div');
    originalPostEl.className = 'original-post';
    let origContentHtml = '';
    if (originalPost.metadata?.title) {
        origContentHtml += `<h3 class="post-title">${originalPost.metadata.title}</h3>`;
    }
    origContentHtml += `<p>${getPostContent(originalPost.metadata)}</p>`;
    const origContentDiv = document.createElement('div');
    origContentDiv.className = 'post-content';
    origContentDiv.innerHTML = origContentHtml;
    originalPostEl.appendChild(origContentDiv);
    // Media for original post
    const media = extractMedia(originalPost.metadata);
    if (media && media.url) {
        const mediaEl = document.createElement('div');
        mediaEl.className = 'post-media';
        if (media.type === 'image') {
            mediaEl.innerHTML = `<img src="${media.url}" alt="Post image" class="post-image">`;
        } else if (media.type === 'video') {
            mediaEl.innerHTML = `
                <video controls class="post-video" ${media.cover ? `poster='${media.cover}'` : ''}>
                    <source src="${media.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                ${media.duration ? `<div class="video-duration">${media.duration}</div>` : ''}
            `;
        } else if (media.type === 'audio') {
            mediaEl.innerHTML = `
                <audio controls class="post-audio">
                    <source src="${media.url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                ${media.cover ? `<div class="audio-cover" style="background-image:url('${media.cover}')"></div>` : ''}
                <div class="audio-info">
                    ${media.artist ? `<div class="audio-artist">${media.artist}</div>` : ''}
                    ${media.genre ? `<div class="audio-genre">${media.genre}</div>` : ''}
                    ${media.credits ? `<div class="audio-credits">${media.credits}</div>` : ''}
                    ${media.duration ? `<div class="audio-duration">${media.duration}</div>` : ''}
                </div>
            `;
        }
        originalPostEl.appendChild(mediaEl);
    }
    // Stats for original post + author info + app icon and repost date
    const statsEl = document.createElement('div');
    statsEl.className = 'post-stats';
    let appLogoHtml = '';
    if (originalPost.app?.metadata?.logo) {
        const appUrl = originalPost.app?.metadata?.url || null;
        const logoImg = `<img src="${originalPost.app.metadata.logo}" alt="${originalPost.app.metadata.name || 'App'}" class="app-logo" style="vertical-align:middle;">`;
        appLogoHtml = appUrl ? `<a href="${appUrl}" target="_blank" rel="noopener">${logoImg}</a>` : logoImg;
    }
    const tsObj = formatTimestamp(repost.timestamp);
    const authorName = originalPost.author.metadata?.name || originalPost.author.username?.value || 'Unknown';
    const authorAvatar = originalPost.author.metadata?.picture || DEFAULT_AVATAR;
    const reposterName = repostedBy.metadata?.name || repostedBy.username?.value || 'Someone';
    
    let postedViaText = appLogoHtml
        ? `via ${appLogoHtml}${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`
        : `${tsObj.isRelative ? '' : 'on '}${tsObj.str}`;
        
    statsEl.innerHTML = `
        <span class="stat">❤️ ${originalPost.stats?.totalUpvotes || 0}</span>
        <span class="stat">💬 ${originalPost.stats?.comments || 0}</span>
        <span class="stat">🔁 ${originalPost.stats?.totalAmountOfMirrors || 0}</span>
        <span class="stat">🔄 ${originalPost.stats?.totalAmountOfCollects || 0}</span>
        <span class="stat posted-via">Posted by ${authorName} <img src="${authorAvatar}" alt="${authorName}" class="author-avatar-small"> • Reposted by ${reposterName} ${postedViaText}</span>
    `;
    originalPostEl.appendChild(statsEl);

    // Assemble the repost card
    postCard.appendChild(repostHeader);
    postCard.appendChild(originalPostEl);
    
    // Add to the posts list
    postsList.appendChild(postCard);
}
