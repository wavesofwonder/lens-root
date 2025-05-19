// Lens API configuration
const LENS_API_URL = 'https://api-v2.lens.dev';
const DEFAULT_AVATAR = 'assets/default-avatar.png';

// Local proxy server URL (for development)
const PROXY_URL = '/api/proxy';

// DOM Elements
const profileImage = document.getElementById('profileImage');
const handleElement = document.getElementById('handle');
const bioElement = document.getElementById('bio');
const followersCount = document.getElementById('followersCount');
const followingCount = document.getElementById('followingCount');
const postsCount = document.getElementById('postsCount');
const postsSection = document.getElementById('postsSection');
const loadingIndicator = document.createElement('div');

// Add loading indicator styles
loadingIndicator.className = 'loading-indicator';
loadingIndicator.innerHTML = '<div class="spinner"></div><p>Loading...</p>';

// Function to show loading state
function showLoading() {
    document.body.appendChild(loadingIndicator);
}

// Function to hide loading state
function hideLoading() {
    loadingIndicator.remove();
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
        const accountResponse = await fetch(`${PROXY_URL}/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: accountQuery,
                variables: {
                    request: {
                        username: {
                            localName: 'danielwonder',
                            namespace: '0x1aA55B9042f08f45825dC4b651B64c9F98Af4615'
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
        const statsResponse = await fetch(`${PROXY_URL}/stats`, {
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
                            authors: ["0xeF9AE7Cc7611a218Df8999A24a5bD970A55dFe3F"]
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

        console.log('Sending posts query:', query);
        
        const response = await fetch(`${PROXY_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
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

    // Post header: author, app, timestamp
    const headerEl = document.createElement('div');
    headerEl.className = 'post-header';
    headerEl.innerHTML = `
        <div class="post-author">
            <img src="${post.author.metadata?.picture || DEFAULT_AVATAR}" 
                 alt="${post.author.metadata?.name || 'User'}" 
                 class="author-avatar">
            <span class="author-name">${post.author.metadata?.name || post.author.username?.value || 'Unknown'}</span>
        </div>
    `;
    postCard.appendChild(headerEl);

    // Create content container
    const contentEl = document.createElement('div');
    
    // Handle ArticleMetadata
    if (post.metadata?.__typename === 'ArticleMetadata') {
        const { title, content, attributes = [] } = post.metadata;
        const attrMap = Object.fromEntries(attributes.map(a => [a.key, a.value]));
        contentEl.className = 'post-content article-content';
        
        // Add cover image if available
        if (attrMap.coverUrl) {
            const coverEl = document.createElement('div');
            coverEl.className = 'article-cover';
            coverEl.innerHTML = `<img src="${attrMap.coverUrl}" alt="${title || 'Article cover'}" class="article-cover-image">`;
            postCard.appendChild(coverEl);
        }
        
        // Add title and content
        let contentHtml = '';
        if (title) contentHtml += `<h2 class="article-title">${title}</h2>`;
        if (attrMap.subtitle) contentHtml += `<h3 class="article-subtitle">${attrMap.subtitle}</h3>`;
        if (content) contentHtml += `<div class="article-body">${content}</div>`;
        contentEl.innerHTML = contentHtml;
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
        ? `Posted via ${appLogoHtml}${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`
        : `Posted${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`;
    statsEl.innerHTML = `
        <span class="stat">❤️ ${post.stats?.totalUpvotes || 0}</span>
        <span class="stat">💬 ${post.stats?.comments || 0}</span>
        <span class="stat">🔁 ${post.stats?.totalAmountOfMirrors || 0}</span>
        <span class="stat">🔄 ${post.stats?.totalAmountOfCollects || 0}</span>
        <span class="stat posted-via">${postedViaText}</span>
    `;
    
    // Assemble the post card
    postCard.appendChild(headerEl);
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
    
    // Original post header: author, app, timestamp
    const originalHeader = document.createElement('div');
    originalHeader.className = 'post-header';
    originalHeader.innerHTML = `
        <div class="post-author">
            <img src="${originalPost.author.metadata?.picture || DEFAULT_AVATAR}" 
                 alt="${originalPost.author.metadata?.name || 'User'}" 
                 class="author-avatar">
            <span class="author-name">${originalPost.author.metadata?.name || originalPost.author.username?.value || 'Unknown'}</span>
        </div>
    `;
    // Original post content (with title and fallback)
    const originalPostEl = document.createElement('div');
    originalPostEl.className = 'original-post';
    originalPostEl.appendChild(originalHeader);
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
    // Stats for original post + app icon and repost date
    const statsEl = document.createElement('div');
    statsEl.className = 'post-stats';
    let appLogoHtml = '';
    if (originalPost.app?.metadata?.logo) {
        const appUrl = originalPost.app?.metadata?.url || null;
        const logoImg = `<img src="${originalPost.app.metadata.logo}" alt="${originalPost.app.metadata.name || 'App'}" class="app-logo" style="vertical-align:middle;">`;
        appLogoHtml = appUrl ? `<a href="${appUrl}" target="_blank" rel="noopener">${logoImg}</a>` : logoImg;
    }
    const tsObj = formatTimestamp(repost.timestamp);
    let repostedViaText = appLogoHtml
        ? `Reposted by ${repostedBy.metadata?.name || repostedBy.username?.value || 'Someone'} via ${appLogoHtml}${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`
        : `Reposted by ${repostedBy.metadata?.name || repostedBy.username?.value || 'Someone'}${tsObj.isRelative ? ' ' : ' on '}${tsObj.str}`;
    statsEl.innerHTML = `
        <span class="stat">❤️ ${originalPost.stats?.totalUpvotes || 0}</span>
        <span class="stat">💬 ${originalPost.stats?.comments || 0}</span>
        <span class="stat">🔁 ${originalPost.stats?.totalAmountOfMirrors || 0}</span>
        <span class="stat">🔄 ${originalPost.stats?.totalAmountOfCollects || 0}</span>
        <span class="stat posted-via">${repostedViaText}</span>
    `;
    originalPostEl.appendChild(statsEl);

    // Assemble the repost card
    postCard.appendChild(repostHeader);
    postCard.appendChild(originalPostEl);
    
    // Add to the posts list
    postsList.appendChild(postCard);
}

// Initialize the profile page
document.addEventListener('DOMContentLoaded', () => {
    // Get the handle from URL parameter or use default
    const urlParams = new URLSearchParams(window.location.search);
    const handle = urlParams.get('handle') || 'danielwonder.lens';
    
    // Fetch profile data
    fetchProfileData(handle);
});
