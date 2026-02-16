// Use in-memory store on Vercel (better-sqlite3 native module often fails in serverless)
import { app } from '../backend/src/index-vercel.js';

/**
 * Vercel serverless handler: forward all /api/* requests to Express.
 * Rewrite sends path as query param; we set req.url so Express sees /expenses etc.
 */
export default async function handler(req, res) {
  try {
    const path = req.query.path;
    req.url = path ? `/${path}` : '/health';
    return app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
}
