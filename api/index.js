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



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Export the Express API
module.exports = app; 