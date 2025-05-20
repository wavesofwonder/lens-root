const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'lens-profile-app'
    };

    try {
      const reqBody = await request.json();

      // /proxy/accounts
      if (pathname.endsWith('/proxy/accounts')) {
        const query = `query Account($request: AccountRequest!) {
          account(request: $request) {
            address
            username { value }
            metadata {
              name
              bio
              picture
              coverPicture
            }
          }
        }`;

        const variables = reqBody.variables || {
          request: {
            username: {
              localName: env.DEFAULT_LOCALNAME,
              namespace: env.DEFAULT_NAMESPACE
            }
          }
        };

        const response = await fetch(env.LENS_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // /proxy/stats
      if (pathname.endsWith('/proxy/stats')) {
        const query = `query AccountStats($address: EvmAddress!) {
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

        const variables = {
          address: reqBody.variables?.address
        };

        const response = await fetch(env.LENS_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // /proxy/posts
      if (pathname.endsWith('/proxy/posts')) {
        const query = reqBody.query;
        const variables = reqBody.variables || {};

        const response = await fetch(env.LENS_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Default 404
      return new Response('Not found', {
        status: 404,
        headers: corsHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
};