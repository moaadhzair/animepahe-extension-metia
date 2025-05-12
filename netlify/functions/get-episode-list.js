const axios = require('axios');


exports.handler = async (event) => {
    try {
        const animeId = event.path.split('/').pop();
        const headers = {
            'Cookie': '__ddg2_=',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        };

        const url = `https://animepahe.ru/api?m=release&id=${animeId}&sort=episode_asc`;
        const response = await axios.get(url, { headers });
        const transformed = response.data.data.map(ep => ({
            cover: ep.snapshot || null,
            name: `Episode ${ep.episode}`,
            link: null,
            id: animeId + 'dumb' + ep.session,
            dub: ep.audio === 'eng',
            sub: true
        }));
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'success', animeId, data: transformed }),
        };
    } catch (error) {
        console.error('Episode list error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ status: 'error', message: error.message }),
        };
    }
}
