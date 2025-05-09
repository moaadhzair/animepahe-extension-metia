# Anime List API

A Node.js API that returns anime list episodes. Currently returns an empty list as a template.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
npm run dev
```

## API Endpoints

- `GET /api/anime-list` - Returns the anime list (currently empty)
- `GET /api/health` - Health check endpoint

## Deployment

This project is configured for deployment on Vercel. To deploy:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.