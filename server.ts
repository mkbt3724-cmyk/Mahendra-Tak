/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily/safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini AI client:', err);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined. AI features will run in simulation mode.');
}

// 1. API: AI-powered game recommendations
app.post('/api/recommend-games', async (req, res) => {
  const { userHistory, userFavorites, allGames } = req.body;

  if (!allGames || !Array.isArray(allGames)) {
    return res.status(400).json({ error: 'Missing or invalid allGames array.' });
  }

  // Fallback data if Gemini is not initialized or fails
  const makeFallbackRecommendations = () => {
    return allGames.map((game, idx) => ({
      gameId: game.id,
      matchScore: 80 + (idx * 5) % 18,
      reason: `Based on your interest in ${game.category} and arcade challenges, Neon sensors suggest ${game.title} represents a perfect gameplay style fit.`,
    })).sort((a, b) => b.matchScore - a.matchScore);
  };

  if (!ai) {
    return res.json({ recommendations: makeFallbackRecommendations(), provider: 'fallback' });
  }

  try {
    const prompt = `You are the GameVerse Recommendation AI. Given the user's gaming history: ${JSON.stringify(userHistory || [])} and their favorite games: ${JSON.stringify(userFavorites || [])}, evaluate this catalog of games: ${JSON.stringify(allGames)}.
Return a list of recommendations from the catalog.
For each matching game, calculate a matchScore (0 to 100) and generate a short, personalized reason (1-2 sentences) in a cybernetic-gaming style explaining why this fits their play style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['recommendations'],
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['gameId', 'matchScore', 'reason'],
                properties: {
                  gameId: { type: Type.STRING, description: 'The exact ID of the recommended game.' },
                  matchScore: { type: Type.INTEGER, description: 'The match percentage from 0 to 100.' },
                  reason: { type: Type.STRING, description: 'Personalized cyber-gaming matching statement.' },
                },
              },
            },
          },
        },
      },
    });

    const text = response.text || '';
    const result = JSON.parse(text);
    return res.json({ recommendations: result.recommendations, provider: 'gemini-3.5-flash' });
  } catch (err) {
    console.error('Error generating AI recommendations:', err);
    return res.json({ recommendations: makeFallbackRecommendations(), provider: 'fallback-on-error' });
  }
});

// 2. SEO: Dynamic Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /games
Allow: /categories
Allow: /blog
Allow: /about
Allow: /contact

Disallow: /admin
Disallow: /dashboard
Disallow: /api/
Disallow: /temp/

Sitemap: ${process.env.APP_URL || 'http://localhost:3000'}/sitemap.xml
`);
});

// 3. SEO: Dynamic Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const host = process.env.APP_URL || 'https://gameverse.play';
  const lastmod = new Date().toISOString().split('T')[0];

  const staticUrls = [
    '',
    '/games',
    '/categories',
    '/blog',
    '/leaderboard',
    '/achievements',
    '/about',
    '/contact',
    '/privacy',
    '/cookies',
    '/terms',
  ];

  // Dynamic game IDs for sitemap
  const games = ['space-shooter', 'cyber-runner', 'minesweeper', 'memory-matrix'];
  const blogs = ['neon-aesthetics-arcade-games', 'gridrunner-2099-reflex-mastery-guide'];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static paths
  staticUrls.forEach((route) => {
    xml += '  <url>\n';
    xml += `    <loc>${host}${route}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  // Add game pages
  games.forEach((game) => {
    xml += '  <url>\n';
    xml += `    <loc>${host}/games/${game}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
  });

  // Add blog pages
  blogs.forEach((blog) => {
    xml += '  <url>\n';
    xml += `    <loc>${host}/blog/${blog}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  res.type('application/xml');
  res.send(xml);
});

// 4. Vite Dev/Static Handlers
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
