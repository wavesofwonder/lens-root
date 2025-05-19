const express = require('express');
const cors = require('cors');
const axios = require('axios');

const LENS_API_URL = 'https://api.lens.xyz/graphql';
const path = require('path');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// Enable CORS for all routes
app.use(cors());

// Add user-agent header to avoid firewall
app.use((req, res, next) => {
    req.headers['user-agent'] = 'lens-profile-app';
    next();
});

// Proxy endpoint for stats (POST endpoint)
app.post('/api/proxy/stats', async (req, res) => {
    try {
        const { query, variables } = req.body;
        console.log('Received stats query:', query);
        console.log('Variables:', variables);
        
        try {
            // Get the account address from the request
            const accountAddress = variables.address;

            // Now make the stats query with the account address
            const statsQuery = `query AccountStats($address: EvmAddress!) {
                accountStats(request: { account: $address }) {
                    feedStats {
                        posts
                        comments
                        reposts
                        quotes
                        reactions
                        collects
                        tips
                    }
                    graphFollowStats {
                        followers
                        following
                    }
                }
            }`;

            const statsVariables = {
                address: accountAddress
            };

            const response = await axios.post(LENS_API_URL, {
                query: statsQuery,
                variables: statsVariables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'lens-profile-app'
                }
            });
            
            console.log('Lens API response:', response.data);
            
            if (response.data.errors) {
                console.error('Lens API errors:', response.data.errors);
                throw new Error('Lens API returned errors');
            }
            
            if (!response.data || !response.data.data || !response.data.data.accountStats) {
                throw new Error('Invalid response from Lens API');
            }
            
            return res.json(response.data);
        } catch (apiError) {
            console.error('Lens API request failed:', apiError);
            return res.status(500).json({
                error: 'Failed to connect to Lens API',
                details: apiError.message
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        console.error('Error response:', error.response?.data);
        
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || error.message,
            details: {
                status: error.response?.status,
                data: error.response?.data
            }
        });
    }
});

// Proxy endpoint for accounts (POST endpoint)
app.post('/api/proxy/accounts', async (req, res) => {
    try {
        const { query, variables } = req.body;
        console.log('Received profile query:', query);
        console.log('Variables:', variables);
        
        try {
            const query = `query Account($request: AccountRequest!) {
                account(request: $request) {
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

            const variables = {
                request: {
                    username: {
                        localName: 'danielwonder',
                        namespace: '0x1aA55B9042f08f45825dC4b651B64c9F98Af4615'
                    }
                }
            };

            const response = await axios.post(LENS_API_URL, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'lens-profile-app'
                }
            });
            
            console.log('Lens API response:', response.data);
            
            if (response.data.errors) {
                console.error('Lens API errors:', response.data.errors);
                throw new Error('Lens API returned errors');
            }
            
            if (!response.data || !response.data.data || !response.data.data.account) {
                throw new Error('Account not found');
            }
            
            // Log the actual data structure for debugging
            console.log('Account data structure:', response.data.data.account);
            
            return res.json(response.data);
        } catch (apiError) {
            console.error('Lens API request failed:', apiError);
            
            if (apiError.response) {
                console.error('API Response:', apiError.response.data);
                return res.status(apiError.response.status).json({
                    error: apiError.response.data?.errors?.[0]?.message || 'API request failed',
                    details: apiError.response.data
                });
            } else {
                console.error('API Error:', apiError.message);
                return res.status(500).json({
                    error: 'Failed to connect to Lens API',
                    details: apiError.message
                });
            }
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching profile:', error);
        console.error('Error response:', error.response?.data);
        
        // Send detailed error message
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || error.message,
            details: {
                status: error.response?.status,
                data: error.response?.data
            }
        });
    }
});

// Proxy endpoint for publications (POST endpoint)
app.post('/api/proxy/posts', async (req, res) => {
    try {
        const { query, variables } = req.body;
        console.log('Received posts query:', query);
        console.log('Variables:', variables);

        // Forward the exact query and variables to the Lens API
        const response = await axios.post(LENS_API_URL, {
            query,
            variables: {}
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'http://localhost:3000'  // Add origin header if needed
            }
        });
        
        console.log('Posts response:', response.data);
        
        if (!response.data || !response.data.data || !response.data.data.posts) {
            throw new Error('Invalid posts response');
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ 
            error: error.message,
            response: error.response?.data 
        });
    }
});

// Fallback to index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
