'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = global.fetch || require('node-fetch');
const db = require('./db');
require('dotenv').config();

const { sendEmail } = require('./controllers/emailHelper');
const leadCreatedTemplate = require('./templates/leadCreated');
const enquiryCreatedTemplate = require('./templates/enquiryCreated');

const bookingsRouter = require('./routes/bookings');
const leadsRouter = require('./routes/leads');
const usersRouter = require('./routes/users');
const toursRouter = require('./routes/tours');
const vehiclesRouter = require('./routes/vehicles');
const driversRouter = require('./routes/drivers');
const authRoutes = require('./routes/auth');
const companiesRouter = require('./routes/companies');

const app = express();
app.set('trust proxy', 1);

/* =========================
   Security & Core Middleware
========================= */

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

/* =========================
   Static Frontend
========================= */

const staticDir = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(express.static(path.join(frontendDir, staticDir)));

/* =========================
   Config
========================= */

const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${PORT}`;

/* =========================
   Service Token Cache (Safe)
========================= */

let cachedToken = null;
let tokenFetchedAt = 0;
let tokenPromise = null;

const TOKEN_TTL_MS = 10 * 60 * 1000;

async function getServiceToken() {
  const now = Date.now();

  if (cachedToken && (now - tokenFetchedAt) < TOKEN_TTL_MS) {
    return cachedToken;
  }

  if (!tokenPromise) {
    tokenPromise = (async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: process.env.SERVICE_EMAIL,
          password: process.env.SERVICE_PASSWORD,
        }),
      });

      if (!res.ok) {
        tokenPromise = null;
        throw new Error(`Service login failed (${res.status})`);
      }

      const data = await res.json();
      const token = data.token || data.accessToken;

      if (!token) {
        tokenPromise = null;
        throw new Error('Service token missing');
      }

      cachedToken = token;
      tokenFetchedAt = Date.now();
      tokenPromise = null;

      return token;
    })();
  }

  return tokenPromise;
}

/* =========================
   Public Enquiry Endpoint
========================= */

app.post('/api/enquiry', async (req, res) => {
  try {
    const { name, phone, email } = req.body || {};

    // Minimal backend safety (frontend already validates)
    if (
      !name || !phone || !email ||
      name.length > 100 ||
      phone.length > 20 ||
      email.length > 150
    ) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const token = await getServiceToken();

    const leadRes = await fetch(`${API_BASE_URL}/api/leads/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone,
        email,
        source: 'Website',
        status: 'New',
      }),
    });

    const contentType = leadRes.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await leadRes.json()
      : await leadRes.text();

    // Duplicate lead
    if (leadRes.status === 409) {
      setImmediate(() => {
        sendEmail(
          email,
          'Thank you for your interest',
          leadCreatedTemplate(name),
          `Hello ${name}, thank you for your interest.`
        ).catch(err => console.error('Customer email error:', err));

        sendEmail(
          'contact.gosrtt@gmail.com',
          'New enquiry for existing lead',
          enquiryCreatedTemplate({ name, phone, email, source: 'Website' }),
          `Existing lead enquiry received`
        ).catch(err => console.error('Admin email error:', err));
      });

      return res.status(200).json({ message: 'Thanks! Your enquiry has been received.' });
    }

    return res.status(leadRes.status).send(payload);

  } catch (err) {
    console.error('[ENQUIRY ERROR]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* =========================
   API Routes
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tours', toursRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/companies', companiesRouter);

/* ========================= Basic Health ========================= */
app.get('/api/health', (req, res) => {
    return res.status(200).json({
        status: 'UP',
        service: 'gosrtt-api',
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        uptime_seconds: Math.floor(process.uptime()),
        env: process.env.NODE_ENV || 'development'
    });
});

/* ========================= Deep Health ========================= */
app.get('/api/health/deep', async (req, res) => {

  if (req.headers['x-health-key'] !== process.env.HEALTH_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = {
    status: 'UP',
    checks: {},
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };

  try {
    // DB check
    await db.query('SELECT 1');
    result.checks.database = 'CONNECTED';
  } catch (err) {
    result.status = 'DEGRADED';
    result.checks.database = 'DISCONNECTED';
  }

  try {
    // Auth service token check
    await getServiceToken();
    result.checks.auth_service = 'AVAILABLE';
  } catch (err) {
    result.status = 'DEGRADED';
    result.checks.auth_service = 'FAILED';
  }

  try {
    // Email transport check (no mail sent)
    await sendEmail(
      process.env.SERVICE_EMAIL,
      'Health Check',
      'Health ping',
      'Health ping'
    );
    result.checks.email = 'OK';
  } catch (err) {
    result.status = 'DEGRADED';
    result.checks.email = 'FAILED';
  }

  return res.status(result.status === 'UP' ? 200 : 503).json(result);
});

/* ========================= Readiness ========================= */
app.get('/api/health/ready', async (req, res) => {
    try {
        await db.query('SELECT 1');
        return res.status(200).json({ ready: true });
    } catch (err) {
        return res.status(503).json({ ready: false });
    }
});


/* =========================
   SPA Routing
========================= */

app.get('/', (req, res) => {
  return res.sendFile(path.join(frontendDir, staticDir, 'index.html'));
});

app.get(/^\/(?!api).*/, (req, res) => {
  return res.status(404).sendFile(path.join(frontendDir, staticDir, '404.html'));
});

/* =========================
   API 404 Handler
========================= */

app.use('/api', (req, res) => {
  return res.status(404).json({
    error: 'Invalid API Route',
    path: req.originalUrl,
  });
});

/* =========================
   Server Start
========================= */

app.listen(PORT, () => {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[INFO][server.js][${now}] Server running on port ${PORT}`);
});
