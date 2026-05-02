#!/usr/bin/env node
// Lightweight local auth server that mirrors the Edge Function contract
// Uses Supabase REST Admin APIs with the service role key. No Supabase CLI required.

import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const app = express();
app.use(express.json());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

app.options('*', (req, res) => res.set(corsHeaders).sendStatus(204));

app.get('/auth/user', async (req, res) => {
  res.set(corsHeaders);
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!auth) return res.status(401).json({ error: 'No token provided' });

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${auth}` },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(401).json({ error: 'Unauthorized', detail: txt });
    }

    const data = await resp.json();
    res.json({ user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/signup', async (req, res) => {
  res.set(corsHeaders);
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(500).json({ error: data });

    // create profile row via REST (PostgREST)
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ user_id: data.id }),
      });
    } catch (e) {
      console.warn('Failed creating profile row:', e.message);
    }

    // Attempt sign in to get a session token
    const form = new URLSearchParams();
    form.append('grant_type', 'password');
    form.append('email', email);
    form.append('password', password);

    const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const tokenData = await tokenResp.json();

    res.json({ user: data, token: tokenData.access_token || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/signin', async (req, res) => {
  res.set(corsHeaders);
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const form = new URLSearchParams();
    form.append('grant_type', 'password');
    form.append('email', email);
    form.append('password', password);

    const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) return res.status(401).json({ error: tokenData });

    // fetch user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResp.json();

    res.json({ user, token: tokenData.access_token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  res.set(corsHeaders);
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '') || '';
    if (!auth) return res.status(401).json({ error: 'No token provided' });

    // validate by calling /auth/v1/user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${auth}` },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid token' });

    res.json({ token: auth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.LOCAL_FUNCTIONS_PORT || 54322;
app.listen(PORT, () => console.log(`Local auth server listening on http://localhost:${PORT}`));
