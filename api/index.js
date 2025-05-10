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
app.get('/api/get-episode-list/:id', (req, res) => {
  // Get the ID from the URL parameter
  const animeId = req.params.id;

  // For now, return an empty list with the requested ID
  const episodeList = [];

  res.json({
    status: 'success',
    id: animeId,
    data: episodeList
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
    
    // Parse the results using regex
    const regex = /"id":(.+?),"title":"(.+?)","type":"(.+?)","episodes":(.+?),"status":"(.+?)","season":"(.+?)","year":(.+?),"score":(.+?),"poster":"(.+?)","session":"(.+?)"/g;
    const searchResults = [];
    let match;
    
    while ((match = regex.exec(searchResultsRaw)) !== null) {
      searchResults.push({
        id: match[1],
        title: match[2],
        type: match[3],
        episodes: match[4],
        status: match[5],
        season: match[6],
        year: match[7],
        score: match[8],
        poster: match[9],
        session: match[10]
      });
    }
    
    res.json({
      status: 'success???',
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