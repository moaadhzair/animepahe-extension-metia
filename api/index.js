const express = require('express');
const axios = require('axios');
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Create the client instance
const client = axios.create();

// API endpoint for anime list
app.get('/api/get-episode-list/:session', async (req, res) => {
  // Get the ID from the URL parameter
  const session = req.params.session;

  try {
    const headers = {
      'Cookie': '__ddg2_=',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const url = `https://animepahe.ru/api?m=release&id=${session}&sort=episode_asc`;

    console.log('Making request to:', url);
    const response = await axios.get(url, { headers });

    res.json({
      status: 'success',
      session: session,
      data: response.data.data
    });
    
  } catch (error) {
    console.error('Error details:', error.response ? {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data
    } : error.message);
  }


  res.status(500).json({
    status: 'error',
    message: 'Failed to search anime',
    error: error.message
  });
});

app.get('/api/search-anime/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword;
    const headers = {
      'Cookie': '__ddg2_=',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const response = await axios.get(`https://animepahe.ru/api?m=search&q=${encodeURIComponent(keyword)}`, { headers });
    
    // Extract the data using regex
    const match = response.data.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
    if (!match) {
      return res.json({ status: 'error', message: 'No data found' });
    }

    const data = JSON.parse(match[1]);
    const searchResults = data.search.data || [];

    res.json({
      status: 'success',
      keyword: keyword,
      data: searchResults
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      details: error.response?.data 
    });
  }
});

// Get episode list endpoint
app.get('/api/episode-list/:animeId', async (req, res) => {
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