const express = require('express');
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API endpoint for anime list
app.get('/api/get-anime-list/:id', (req, res) => {
  // Get the ID from the URL parameter
  const animeId = req.params.id;
  
  // For now, return an empty list with the requested ID
  const animeList = [];
  
  res.json({
    status: 'success',
    id: animeId,
    data: animeList
  });
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