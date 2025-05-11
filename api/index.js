const express = require('express');
const axios = require('axios');
const app = express();
const cheerio = require('cheerio');
const https = require('https');

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Create the client instance
const client = axios.create();

// API endpoint for anime list
app.get('/api/search-anime/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword;
    const headers = {
      'Cookie': '__ddg2_=',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const url = `https://animepahe.ru/api?m=search&q=${encodeURIComponent(keyword)}`;

    const response = await client.get(url, { headers });
    const searchResultsRaw = response.data;


    const searchResults = searchResultsRaw.data;

    res.json({
      status: 'success',
      keyword: keyword,
      data: searchResults
    });
  } catch (error) {
    console.error('Search error:', error.response ? {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data
    } : error.message);

    res.status(500).json({
      status: 'error',
      message: 'Failed to search anime',
      error: error.message
    });
  }




});

// Get episode list endpoint
app.get('/api/get-episode-list/:animeId', async (req, res) => {
  try {
    const animeId = req.params.animeId;
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

    // Transform the data into the desired format
    const transformedEpisodes = response.data.data.map(episode => ({
      cover: episode.snapshot || null,
      name: `Episode ${episode.episode}`,
      link: null,
      id: episode.session,
      dub: episode.audio === 'eng',
      sub: true
    }));

    res.json({
      status: 'success',
      animeId: animeId,
      data: transformedEpisodes
    });
  } catch (error) {
    console.error('Episode list error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response?.data
    });
  }
});



app.get('/api/streamData/:episodeSession', async (req, res) => {
  const sessionId = req.params.episodeSession;
  const url = `https://animepahe.ru/play/${sessionId}`;

  const headers = {
    'Referer': 'https://animepahe.ru/',
    'Cookie': '__ddg2_=',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
  };

  try {
    // Fetch the HTML content of the page
    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    const sources = [];

    // Extract the providers, quality, and audio details
    $('#resolutionMenu button').each((i, el) => {
      const element = $(el);
      const provider = element.attr('data-fansub');
      const link = element.attr('data-src');
      const quality = element.attr('data-resolution');
      const audio = element.attr('data-audio');

      sources.push({
        provider: `${provider} ${quality}p`,
        link,
        dub: audio === 'eng',
        sub: audio === 'jpn',
        m3u8: null // m3u8 will be fetched later
      });
    });

    // Fetch m3u8 links directly in the same route
    const m3u8Fetches = await Promise.all(
      sources.map(async (source) => {
        try {
          const page = await axios.get(source.link, { 
            headers: {
              'Referer': 'https://animepahe.ru/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
            }
           });
          const m3u8 = extractM3U8(page.data);
          return { ...source, m3u8 };
        } catch (err) {
          console.error(`Failed to fetch m3u8 for ${source.provider}`, err.message);
          return { ...source, m3u8: null };
        }
      })
    );

    // Return the final stream data as JSON
    res.json(m3u8Fetches);
  } catch (error) {
    console.error('Error fetching stream data:', error.message);
    res.status(500).send('Error fetching stream data');
  }
});

// Helper to extract m3u8 link from obfuscated eval
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


// Helper to extract m3u8 link from obfuscated eval
function extractM3U8(html) {
  const match = html.match(/eval\((.*?)\)<\/script>/s);
  if (!match) return null;

  try {
    const wrapped = `var data = ${match[1]}; data;`;
    const result = eval(wrapped); // ⚠️ Only safe here because structure is predictable
    const m3u8Match = result.match(/['"]([^'"]+\.m3u8)['"]/);
    return m3u8Match ? m3u8Match[1] : null;
  } catch (err) {
    return null;
  }
}



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not found' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export the Express API
module.exports = app; 
