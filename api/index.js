const express = require('express');
const axios = require('axios');
const app = express();
const cheerio = require('cheerio');
const vm = require('vm');

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




app.get('/api/streamData/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const url = `https://animepahe.ru/play/${sessionId}`;

    const headers = {
      'referer': 'https://animepahe.ru/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Cookie': '__ddg2_='
    };

    const pageRes = await axios.get(url, { headers });
    const $ = cheerio.load(pageRes.data);

    const results = [];

    $('#resolutionMenu .dropdown-item').each((_, el) => {
      const btn = $(el);
      const provider = btn.attr('data-fansub');
      const resolution = btn.attr('data-resolution');
      const audio = btn.attr('data-audio');
      const streamLink = btn.attr('data-src');

      results.push({
        provider: `${provider} ${resolution}p`,
        link: streamLink,
        dub: audio === 'eng',
        sub: audio === 'jpn',
        m3u8: null  // will be filled below
      });
    });

    // Fetch m3u8 links for each provider link
    for (const item of results) {
      try {
        const providerPage = await axios.get(item.link, { headers });
        const evalMatches = providerPage.data.match(/eval\(function\(p,a,c,k,e,d\).*?\)/gs);

        if (evalMatches && evalMatches.length >= 2) {
          // Safely evaluate the second obfuscated eval block
          const context = {};
          vm.createContext(context); // create a sandboxed environment

          const script = new vm.Script(evalMatches[1]);
          script.runInContext(context);

          const m3u8Match = providerPage.data.match(/source\s*=\s*['"]([^'"]+\.m3u8)['"]/);
          if (m3u8Match) {
            item.m3u8 = m3u8Match[1];
          }
        }
      } catch (err) {
        console.warn(`Failed to get m3u8 for ${item.link}: ${err.message}`);
      }
    }

    res.json({
      status: 'success',
      sessionId,
      data: results
    });

  } catch (err) {
    console.error('Stream data error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      details: err.response?.data
    });
  }
});



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
