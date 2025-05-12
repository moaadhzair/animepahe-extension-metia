const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Routes
router.get('/search-anime/:keyword', async (req, res) => {
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
    const response = await axios.get(url, { headers });
    res.json({ status: 'success', keyword, data: response.data.data });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to search anime', error: error.message });
  }
});

router.get('/get-episode-list/:animeId', async (req, res) => {
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
    const transformed = response.data.data.map(ep => ({
      cover: ep.snapshot || null,
      name: `Episode ${ep.episode}`,
      link: null,
      id: ep.session,
      dub: ep.audio === 'eng',
      sub: true
    }));
    res.json({ status: 'success', animeId, data: transformed });
  } catch (error) {
    console.error('Episode list error:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/streamData/:episodeSession', async (req, res) => {
  const sessionId = req.params.episodeSession;
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
      sources.map(async (src) => {
        try {
          const res2 = await axios.get(src.link, { headers });
          const match = res2.data.match(/['"]([^'"]+\.m3u8)['"]/);
          return { ...src, m3u8: match ? match[1] : null };
        } catch (e) {
          return { ...src, m3u8: null };
        }
      })
    );

    res.json(m3u8Fetches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stream data' });
  }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
