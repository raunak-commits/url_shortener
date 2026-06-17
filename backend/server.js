const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { pool, initDB } = require('./db');
const authRoutes = require('./auth');

dotenv.config();

const app = express();

// Explicit CORS configuration to allow your Vercel frontend
app.use(cors({
  origin: ['https://url-shortener-ten-lime.vercel.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

initDB();

app.use('/auth', authRoutes);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// CREATE short URL
app.post('/urls', authenticateToken, async (req, res) => {
  try {
    const { original_url, title } = req.body;
    const cleanUrl = original_url.trim();

    if (!cleanUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(cleanUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format — make sure to include https://' });
    }

    const short_code = nanoid(7);

    const result = await pool.query(
      'INSERT INTO urls (user_id, original_url, short_code, title) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, cleanUrl, short_code, title || '']
    );

    res.json({ url: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all URLs for user
app.get('/urls', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ urls: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET analytics for a URL
app.get('/urls/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const urlResult = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const clicksResult = await pool.query(
      'SELECT device, browser, clicked_at FROM clicks WHERE url_id = $1 ORDER BY clicked_at DESC',
      [id]
    );

    const deviceBreakdown = clicksResult.rows.reduce((acc, click) => {
      acc[click.device] = (acc[click.device] || 0) + 1;
      return acc;
    }, {});

    const browserBreakdown = clicksResult.rows.reduce((acc, click) => {
      acc[click.browser] = (acc[click.browser] || 0) + 1;
      return acc;
    }, {});

    res.json({
      url: urlResult.rows[0],
      totalClicks: clicksResult.rows.length,
      deviceBreakdown,
      browserBreakdown,
      recentClicks: clicksResult.rows.slice(0, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a URL
app.delete('/urls/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM urls WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REDIRECT short URL
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'SELECT * FROM urls WHERE short_code = $1', [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const url = result.rows[0];

    const ua = req.headers['user-agent'] || '';
    const device = /mobile/i.test(ua) ? 'mobile' : 'desktop';
    const browser = /chrome/i.test(ua) ? 'Chrome' :
                    /firefox/i.test(ua) ? 'Firefox' :
                    /safari/i.test(ua) ? 'Safari' : 'Other';

    await pool.query(
      'INSERT INTO clicks (url_id, device, browser) VALUES ($1, $2, $3)',
      [url.id, device, browser]
    );

    await pool.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE id = $1',
      [url.id]
    );

    res.redirect(url.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});