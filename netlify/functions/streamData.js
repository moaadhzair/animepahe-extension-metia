const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent'); // ✅ Destructure it!

exports.handler = async (event) => {
    const sessionId = event.path.split('/').pop();
    const url = `https://animepahe.ru/play/${sessionId}`;
    const headers = {
        'Referer': 'https://animepahe.ru/',
        'Cookie': '__ddg2_=',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };

    try {
        const response = await axios.get(url, { headers });
        const $ = cheerio.load(response.data);
        const sources = [];

        $('#resolutionMenu button').each((i, el) => {
            const el$ = $(el);
            sources.push({
                provider: `${el$.attr('data-fansub')} ${el$.attr('data-resolution')}p`,
                link: el$.attr('data-src'),
                dub: el$.attr('data-audio') === 'eng',
                sub: el$.attr('data-audio') === 'jpn',
                m3u8: null
            });
        });

        const m3u8Fetches = await Promise.all(
            sources.map(async (source) => {
                try {
                    const proxyUrl = 'http://user-moaadhzair_Tl3H4-country-US:jHcUK=F5C6gLdp4@dc.oxylabs.io:8000';
                    const agent = new HttpsProxyAgent(proxyUrl);

                    const page = await axios.get(source.link, {
                        httpsAgent: agent,
                        headers: {
                            'Referer': 'https://animepahe.ru/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
                        }
                    });

                    const html = page.data;
                    m3u8 = "";
                    const match = html.match(/;eval(.*?)<\/script>/s);
                    if (!match) return null;

                    try {
                        const wrapped = `var data = ${match[1]}; data;`;
                        const result = eval(wrapped);

                        // ⚠️ Only safe here because structure is predictable
                        const m3u8Match = result.match(/['"]([^'"]+\.m3u8)['"]/);
                        m3u8 = m3u8Match ? m3u8Match[1] : null;
                    } catch (err) {
                        console.log(err);

                        return "null";
                    }


                    return { ...source, m3u8 };
                } catch (err) {
                    console.error(`Failed to fetch m3u8 for ${source.provider}`, err.message);
                    return { ...source, m3u8: null };
                }
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(m3u8Fetches),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch stream data' }),
        };
    }


}

function extractM3U8(html) {
    const match = html.match(/;eval(.*?)<\/script>/s);
    if (!match) return null;

    try {
        const wrapped = `var data = ${match[1]}; data;`;
        const result = eval(wrapped);

        // ⚠️ Only safe here because structure is predictable
        const m3u8Match = result.match(/['"]([^'"]+\.m3u8)['"]/);
        return m3u8Match ? m3u8Match[1] : null;
    } catch (err) {
        console.log(err);

        return null;
    }
}