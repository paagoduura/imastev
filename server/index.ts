import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import crypto from 'crypto';
import { createDailyRoom, createMeetingToken } from './dailyClient.ts';
import { analyzeWithAI } from './aiAnalysis.ts';
import { initializePayment, verifyPayment, generateTransactionRef } from './quicktellerClient.ts';
import { resolveDatabaseConfig } from './dbConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const databaseConfig = resolveDatabaseConfig();

const SESSION_SECRET = process.env.SESSION_SECRET?.trim();
let hasWarnedOptionalAuthSecret = false;
let _fallbackJwtSecret: string | null = null;
if (!SESSION_SECRET) {
  console.warn('Warning: SESSION_SECRET is not set. A temporary in-memory secret will be used for development only. Set SESSION_SECRET in your environment for production.');
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'imastev@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'admin@123';

// Safe startup debug: expose configured admin email (do NOT log passwords)
console.log(`Configured admin email: ${ADMIN_EMAIL}`);

const ALLOWED_SCAN_TYPES = new Set(['skin', 'hair']);
const COMMUNITY_TYPES = new Set(['hair', 'skin']);
const COMMUNITY_REACTIONS = new Set(['like', 'love']);
const PROFILE_FIELDS = [
  'full_name',
  'age',
  'sex',
  'phone',
  'location',
  'skin_type',
  'fitzpatrick_scale',
  'skin_concerns',
  'hair_type',
  'hair_porosity',
  'hair_density',
  'hair_length',
  'is_chemically_treated',
  'chemical_treatments',
  'scalp_condition',
  'hair_concerns',
  'hair_goals',
  'is_pregnant',
  'medical_conditions',
  'current_medications',
  'allergies',
  'onboarding_completed'
] as const;
const PRODUCT_FIELDS = [
  'sku',
  'name',
  'description',
  'price_ngn',
  'category',
  'product_type',
  'image_url',
  'stock_quantity',
  'is_active',
  'ingredients',
  'suitable_for_conditions',
  'suitable_hair_types',
  'suitable_hair_concerns',
  'contraindications'
] as const;

function getJwtSecret() {
  if (SESSION_SECRET) return SESSION_SECRET;

  if (_fallbackJwtSecret) return _fallbackJwtSecret;

  // Generate a temporary secret for dev so JWT signing doesn't throw.
  _fallbackJwtSecret = crypto.randomBytes(32).toString('hex');
  if (!hasWarnedOptionalAuthSecret) {
    console.warn('Using generated temporary SESSION_SECRET for JWT signing. Set SESSION_SECRET env var to a persistent secret to avoid this.');
    hasWarnedOptionalAuthSecret = true;
  }
  return _fallbackJwtSecret;
}

function getAdminEmail() {
  return ADMIN_EMAIL;
}

function getAdminPassword() {
  return ADMIN_PASSWORD;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || '';
}

function getSupabaseAuthKey() {
  return process.env.SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || process.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
}

function createAdminToken(email: string) {
  return jwt.sign({ email, role: 'admin', isAdmin: true }, getJwtSecret(), { expiresIn: '12h' });
}

function normalizeScanType(value: unknown): 'skin' | 'hair' {
  const input = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ALLOWED_SCAN_TYPES.has(input) ? (input as 'skin' | 'hair') : 'skin';
}

function normalizeCommunityType(value: unknown): 'hair' | 'skin' {
  const input = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return COMMUNITY_TYPES.has(input) ? (input as 'hair' | 'skin') : 'hair';
}

function normalizeCommunityReaction(value: unknown): 'like' | 'love' | null {
  const input = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return COMMUNITY_REACTIONS.has(input) ? (input as 'like' | 'love') : null;
}

function isSupabaseManagedPasswordHash(value: unknown) {
  return typeof value === 'string' && value === 'supabase-auth-managed';
}

function isGoogleManagedPasswordHash(value: unknown) {
  return typeof value === 'string' && value === 'google-oauth';
}

async function signInWithSupabasePassword(email: string, password: string) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAuthKey();

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false as const, error: 'Supabase auth is not configured' };
  }

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false as const,
      error: typeof payload?.msg === 'string'
        ? payload.msg
        : typeof payload?.error_description === 'string'
          ? payload.error_description
          : typeof payload?.error === 'string'
            ? payload.error
            : 'Supabase sign in failed',
    };
  }

  const user = payload?.user;
  const accessToken = typeof payload?.access_token === 'string' ? payload.access_token : '';
  if (!user?.email) {
    return { ok: false as const, error: 'Supabase sign in response did not include a user' };
  }

  return {
    ok: true as const,
    user: {
      id: typeof user.id === 'string' ? user.id : null,
      email: String(user.email).trim().toLowerCase(),
      created_at: typeof user.created_at === 'string' ? user.created_at : null,
      email_confirmed_at: typeof user.email_confirmed_at === 'string' ? user.email_confirmed_at : null,
    },
    accessToken,
  };
}

async function syncLocalUserFromSupabaseAuth(email: string, password: string, existingUser?: any) {
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser?.id) {
    const updated = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           email_verified_at = COALESCE(email_verified_at, NOW()),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, created_at, email_verified_at`,
      [passwordHash, existingUser.id]
    );
    return updated.rows[0];
  }

  const inserted = await pool.query(
    `INSERT INTO users (email, password_hash, email_verified_at)
     VALUES ($1, $2, NOW())
     RETURNING id, email, created_at, email_verified_at`,
    [email, passwordHash]
  );

  const user = inserted.rows[0];
  await pool.query(
    'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [user.id]
  );
  await pool.query(
    'INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT (user_id, role) DO NOTHING',
    [user.id, 'patient']
  );
  return user;
}

async function ensureUserScaffold(userId: string) {
  await pool.query(
    'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
  await pool.query(
    'INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT (user_id, role) DO NOTHING',
    [userId, 'patient']
  );

  const freePlan = await pool.query("SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1");
  if (freePlan.rows.length === 0) return;

  const existingSubscription = await pool.query(
    'SELECT id FROM subscriptions WHERE user_id = $1 AND plan_id = $2 AND status = $3 LIMIT 1',
    [userId, freePlan.rows[0].id, 'active']
  );
  if (existingSubscription.rows.length > 0) return;

  await pool.query(
    'INSERT INTO subscriptions (user_id, plan_id, status) VALUES ($1, $2, $3)',
    [userId, freePlan.rows[0].id, 'active']
  );
}

async function verifyGoogleIdToken(idToken: string) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return { ok: false as const, error: 'Google sign-in is not configured on the server' };
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false as const, error: 'Google token verification failed' };
  }

  if (String(payload.aud || '') !== clientId) {
    return { ok: false as const, error: 'Google token audience mismatch' };
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) {
    return { ok: false as const, error: 'Google account email is missing' };
  }

  return {
    ok: true as const,
    profile: {
      email,
      emailVerified: String(payload.email_verified || '') === 'true',
      fullName: typeof payload.name === 'string' ? payload.name.trim() : '',
      googleUserId: typeof payload.sub === 'string' ? payload.sub : '',
      picture: typeof payload.picture === 'string' ? payload.picture : '',
    }
  };
}

async function upsertGoogleUser(profile: { email: string; emailVerified: boolean; fullName: string; googleUserId: string; picture: string }) {
  const existing = await pool.query(
    'SELECT id, email, created_at, email_verified_at, password_hash FROM users WHERE email = $1 LIMIT 1',
    [profile.email]
  );

  let user = existing.rows[0] || null;

  if (!user) {
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at, email_verified_at`,
      [profile.email, 'google-oauth', profile.emailVerified ? new Date().toISOString() : new Date().toISOString()]
    );
    user = inserted.rows[0];
  } else {
    const updated = await pool.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, $1),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, created_at, email_verified_at, password_hash`,
      [profile.emailVerified ? new Date().toISOString() : new Date().toISOString(), user.id]
    );
    user = updated.rows[0];
  }

  await ensureUserScaffold(user.id);

  if (profile.fullName) {
    await pool.query(
      `UPDATE profiles
       SET full_name = COALESCE(NULLIF(full_name, ''), $1),
           updated_at = NOW()
       WHERE user_id = $2`,
      [profile.fullName, user.id]
    );
  }

  return user;
}

function defaultCommunityAuthor(email: string | null | undefined): string {
  const prefix = String(email || '').split('@')[0] || 'Community Member';
  return prefix.replace(/[._-]+/g, ' ').trim() || 'Community Member';
}

function normalizeCommunityFileExtension(contentType: string, fileName: string): string {
  const byType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  const normalizedType = String(contentType || '').toLowerCase();
  if (byType[normalizedType]) return byType[normalizedType];

  const ext = path.extname(fileName || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext;
  }
  return '.jpg';
}

function normalizePhoneNumber(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

function sanitizeProfilePayload(payload: any): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key];
    }
  }

  // Legacy frontend field alias
  if (Object.prototype.hasOwnProperty.call(payload, 'country')) {
    sanitized.location = payload.country;
  }

  return sanitized;
}

function sanitizeProductPayload(payload: any): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized: Record<string, unknown> = {};
  for (const key of PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
}

function getPublicBaseUrl() {
  const explicit =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    '';

  if (explicit) {
    if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
      return explicit.replace(/\/+$/, '');
    }
    return `https://${explicit.replace(/\/+$/, '')}`;
  }

  const replDomain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (replDomain) {
    return `https://${replDomain}`;
  }

  const frontendPort = process.env.FRONTEND_PORT?.trim() || '5173';
  return `http://localhost:${frontendPort}`;
}

function getApiBaseUrl() {
  const explicitApi =
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim() ||
    '';

  if (explicitApi) {
    if (explicitApi.startsWith('http://') || explicitApi.startsWith('https://')) {
      return explicitApi.replace(/\/+$/, '');
    }
    return `https://${explicitApi.replace(/\/+$/, '')}`;
  }

  const replDomain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (replDomain) {
    return `https://${replDomain}`;
  }

  return `http://localhost:${PORT}`;
}

const EMAIL_VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function hashVerificationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateEmailVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function resolveVerificationAppUrl(req: express.Request) {
  const origin = req.get('origin')?.trim();
  if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
    return origin.replace(/\/+$/, '');
  }

  const referer = req.get('referer')?.trim();
  if (referer) {
    try {
      const parsed = new URL(referer);
      return parsed.origin.replace(/\/+$/, '');
    } catch {
      // fall back to public base url below
    }
  }

  return getPublicBaseUrl();
}

function buildEmailVerificationLink(req: express.Request, token: string) {
  const baseUrl = resolveVerificationAppUrl(req);
  const params = new URLSearchParams({ verify_token: token });
  return `${baseUrl}/auth?${params.toString()}`;
}

function getEmailTransportConfig() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    return { transport: nodemailer.createTransport(smtpUrl), from: process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || 'no-reply@imstevnaturals.com' };
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || port === 465;
  return {
    transport: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    from: process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || user,
  };
}

async function sendVerificationEmail(req: express.Request, email: string, token: string) {
  const verificationUrl = buildEmailVerificationLink(req, token);
  const mailConfig = getEmailTransportConfig();

  if (!mailConfig) {
    console.log(`Email verification link for ${email}: ${verificationUrl}`);
    return;
  }

  await mailConfig.transport.sendMail({
    from: mailConfig.from,
    to: email,
    subject: 'Verify your IMSTEV NATURALS account',
    text: `Welcome to IMSTEV NATURALS. Verify your email by opening this link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Verify your IMSTEV NATURALS account</h2>
        <p>Thanks for signing up. Confirm your email address to activate your account.</p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl}" style="background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Verify Email</a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });
}

// Database connection
const pool = new Pool(databaseConfig.poolConfig);

if (databaseConfig.source === 'supabase_derived') {
  console.log('Database configured from Supabase settings.');
} else if (databaseConfig.source === 'missing') {
  console.warn(`Database config missing: ${databaseConfig.reason}`);
}

// Middleware - CORS first
app.use(cors());

// Now apply JSON middleware
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = normalizeScanType(req.body.type);
    const dir = `${uploadsDir}/${type}-scans`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const parseScanUpload = (req: any, res: any, next: any) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  return next();
};

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin authorization required' });
  }

  jwt.verify(token, getJwtSecret(), (err: any, decoded: any) => {
    if (err || !decoded?.isAdmin || decoded?.role !== 'admin') {
      return res.status(403).json({ error: 'Invalid admin token' });
    }
    req.admin = decoded;
    next();
  });
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = generateEmailVerificationToken();
    const verificationTokenHash = hashVerificationToken(verificationToken);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, email_verification_token_hash, email_verification_sent_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, created_at`,
      [email, passwordHash, verificationTokenHash]
    );
    
    const user = result.rows[0];
    
    await ensureUserScaffold(user.id);

    await sendVerificationEmail(req, user.email, verificationToken);

    res.status(201).json({
      user,
      requiresEmailVerification: true,
      message: 'Verification email sent. Please verify your email before signing in.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const existingUser = result.rows[0];
    let user = existingUser || null;
    let validPassword = false;

    if (existingUser?.password_hash && isGoogleManagedPasswordHash(existingUser.password_hash)) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google to access it.' });
    }

    if (existingUser?.password_hash && !isSupabaseManagedPasswordHash(existingUser.password_hash)) {
      validPassword = await bcrypt.compare(password, existingUser.password_hash);
    }

    if (!validPassword) {
      const supabaseSignIn = await signInWithSupabasePassword(email, password);
      if (!supabaseSignIn.ok) {
        const message = supabaseSignIn.error.toLowerCase();
        const needsVerification = message.includes('confirm') || message.includes('verify');
        return res.status(needsVerification ? 403 : 401).json({
          error: needsVerification
            ? 'Please verify your email before signing in.'
            : 'Invalid credentials',
          ...(needsVerification ? { requiresEmailVerification: true } : {}),
        });
      }

      user = await syncLocalUserFromSupabaseAuth(email, password, existingUser);
      validPassword = true;
    }

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email_verified_at) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        requiresEmailVerification: true,
      });
    }
    
    // Generate token with 30-minute expiry
    const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });
    
    res.json({ 
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token 
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const idToken = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
    if (!idToken) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const verification = await verifyGoogleIdToken(idToken);
    if (!verification.ok) {
      return res.status(401).json({ error: verification.error });
    }

    const user = await upsertGoogleUser(verification.profile);
    const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });

    res.json({
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token,
    });
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const token = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const tokenHash = hashVerificationToken(token);
    const result = await pool.query(
      `SELECT id, email, created_at, email_verified_at, email_verification_sent_at
       FROM users
       WHERE email_verification_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification link' });
    }

    const user = result.rows[0];
    if (user.email_verified_at) {
      const existingToken = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });
      return res.json({
        success: true,
        alreadyVerified: true,
        user: { id: user.id, email: user.email, created_at: user.created_at },
        token: existingToken,
      });
    }

    const sentAtMs = user.email_verification_sent_at ? new Date(user.email_verification_sent_at).getTime() : 0;
    if (!sentAtMs || sentAtMs + EMAIL_VERIFICATION_WINDOW_MS < Date.now()) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    await pool.query(
      `UPDATE users
       SET email_verified_at = NOW(),
           email_verification_token_hash = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    const authToken = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });
    res.json({
      success: true,
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token: authToken,
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      `SELECT id, email, email_verified_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for that email' });
    }

    const user = result.rows[0];
    if (user.email_verified_at) {
      return res.status(400).json({ error: 'This email is already verified' });
    }

    const verificationToken = generateEmailVerificationToken();
    const verificationTokenHash = hashVerificationToken(verificationToken);
    await pool.query(
      `UPDATE users
       SET email_verification_token_hash = $1,
           email_verification_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [verificationTokenHash, user.id]
    );

    await sendVerificationEmail(req, user.email, verificationToken);
    res.json({ success: true, message: 'Verification email sent.' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/user', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Token refresh endpoint - extends session on activity
app.post('/api/auth/refresh', authenticateToken, async (req: any, res) => {
  try {
    // Issue a new token with fresh 30-minute expiry
    const newToken = jwt.sign({ id: req.user.id, email: req.user.email }, getJwtSecret(), { expiresIn: '30m' });
    res.json({ token: newToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

app.post('/api/admin/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (email !== getAdminEmail() || password !== getAdminPassword()) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = createAdminToken(email);
    res.json({
      admin: {
        email,
        role: 'admin',
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/me', authenticateAdmin, async (req: any, res) => {
  res.json({
    admin: {
      email: req.admin.email,
      role: 'admin',
    },
  });
});

app.get('/api/admin/overview', authenticateAdmin, async (req, res) => {
  try {
    const [
      usersResult,
      productsResult,
      ordersResult,
      appointmentsResult,
      salonAppointmentsResult,
      revenueResult,
      pendingOrdersResult,
      lowStockResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
      pool.query('SELECT COUNT(*)::int AS count FROM orders'),
      pool.query('SELECT COUNT(*)::int AS count FROM appointments'),
      pool.query('SELECT COUNT(*)::int AS count FROM salon_appointments'),
      pool.query(`SELECT COALESCE(SUM(total_amount_ngn), 0)::float AS total FROM orders WHERE payment_status IN ('paid', 'successful') OR status IN ('processing', 'completed')`),
      pool.query(`SELECT COUNT(*)::int AS count FROM orders WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM products WHERE is_active = true AND stock_quantity <= 10`),
    ]);

    res.json({
      stats: {
        totalUsers: usersResult.rows[0]?.count || 0,
        totalProducts: productsResult.rows[0]?.count || 0,
        totalOrders: ordersResult.rows[0]?.count || 0,
        totalAppointments: appointmentsResult.rows[0]?.count || 0,
        totalSalonBookings: salonAppointmentsResult.rows[0]?.count || 0,
        totalRevenue: Number(revenueResult.rows[0]?.total || 0),
        pendingOrders: pendingOrdersResult.rows[0]?.count || 0,
        lowStockProducts: lowStockResult.rows[0]?.count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.created_at,
         p.full_name,
         p.phone,
         p.location,
         p.onboarding_completed,
         COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]'::json) AS roles,
         sp.name AS subscription_name,
         s.status AS subscription_status
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
       GROUP BY u.id, p.id, sp.name, s.status
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: get single user details
app.get('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await pool.query(
      `SELECT u.id, u.email, u.created_at, p.*, COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]'::json) AS roles
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, p.id`,
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: create user
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { email, password, full_name, phone, location, roles } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email, created_at',
      [email.trim().toLowerCase(), passwordHash]
    );

    const user = userResult.rows[0];

    await pool.query('INSERT INTO profiles (user_id, full_name, phone, location, onboarding_completed) VALUES ($1, $2, $3, $4, $5)', [user.id, full_name || null, phone || null, location || null, false]);

    if (Array.isArray(roles) && roles.length > 0) {
      const roleInserts = roles.map((r: string) => pool.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [user.id, r]));
      await Promise.all(roleInserts);
    } else {
      await pool.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [user.id, 'patient']);
    }

    const created = await pool.query(
      `SELECT u.id, u.email, u.created_at, p.full_name, p.phone, p.location, COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]'::json) AS roles
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, p.id`,
      [user.id]
    );

    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: update user (email, password, profile, roles)
app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, password, full_name, phone, location, roles } = req.body || {};

    // Update email if provided
    if (email) {
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email.trim().toLowerCase(), userId]);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    }

    // Upsert profile fields (including onboarding_completed when provided)
    await pool.query(
      `INSERT INTO profiles (user_id, full_name, phone, location, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, location = EXCLUDED.location, onboarding_completed = EXCLUDED.onboarding_completed`,
      [userId, full_name || null, phone || null, location || null, typeof req.body.onboarding_completed === 'boolean' ? req.body.onboarding_completed : null]
    );

    // Update roles: remove existing and insert provided
    if (Array.isArray(roles)) {
      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      const inserts = roles.map((r: string) => pool.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [userId, r]));
      await Promise.all(inserts);
    }

    const updated = await pool.query(
      `SELECT u.id, u.email, u.created_at, p.full_name, p.phone, p.location, COALESCE(json_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]'::json) AS roles
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, p.id`,
      [userId]
    );

    if (updated.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(updated.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: delete user and related data
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    // Delete dependent records where appropriate
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM scans WHERE user_id = $1', [userId]);
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM products
       ORDER BY updated_at DESC NULLS LAST, created_at DESC, name ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: get single product
app.get('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: delete product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    // Attempt to remove dependent order items first to avoid FK issues
    await pool.query('DELETE FROM order_items WHERE product_id = $1', [productId]);

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [productId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/products', authenticateAdmin, async (req: any, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid product fields were provided' });
    }

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((key) => payload[key]);
    const result = await pool.query(
      `INSERT INTO products (${keys.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, NOW(), NOW())
       RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req: any, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid product fields were provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE products
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.*,
         u.email AS user_email,
         p.full_name AS customer_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', oi.id,
               'quantity', oi.quantity,
               'price_at_purchase', oi.price_at_purchase,
               'product_name', pr.name
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN profiles p ON p.user_id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products pr ON pr.id = oi.product_id
       GROUP BY o.id, u.email, p.full_name
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const allowedFields = ['status', 'payment_status', 'notes'];
    const payload = req.body || {};
    const keys = Object.keys(payload).filter((key) => allowedFields.includes(key));
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid order fields were provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE orders
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/appointments', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.*,
         cp.full_name AS clinician_name,
         c.specialty AS clinician_specialty,
         pp.full_name AS patient_name,
         u.email AS patient_email
       FROM appointments a
       JOIN clinicians c ON c.id = a.clinician_id
       LEFT JOIN profiles cp ON cp.user_id = c.user_id
       LEFT JOIN profiles pp ON pp.user_id = a.patient_user_id
       LEFT JOIN users u ON u.id = a.patient_user_id
       ORDER BY a.scheduled_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/appointments/:id', authenticateAdmin, async (req, res) => {
  try {
    const allowedFields = ['status', 'notes', 'prescription', 'follow_up_date'];
    const payload = req.body || {};
    const keys = Object.keys(payload).filter((key) => allowedFields.includes(key));
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid appointment fields were provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE appointments
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/salon-bookings', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM salon_appointments
       ORDER BY appointment_date DESC, time_slot DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/salon-bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const allowedFields = ['status', 'payment_status', 'notes'];
    const payload = req.body || {};
    const keys = Object.keys(payload).filter((key) => allowedFields.includes(key));
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid salon booking fields were provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE salon_appointments
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salon booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROFILE ROUTES ====================

app.get('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    const fields = sanitizeProfilePayload(req.body);
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid profile fields were provided' });
    }

    const setClause = keys
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [req.user.id, ...keys.map((key) => fields[key])];
    
    const result = await pool.query(
      `UPDATE profiles SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST route for profiles - handles upsert (insert or update)
app.post('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    const profileData = sanitizeProfilePayload(req.body);
    
    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existingProfile.rows.length > 0) {
      const keys = Object.keys(profileData);
      if (keys.length === 0) {
        const current = await pool.query(
          'SELECT * FROM profiles WHERE user_id = $1',
          [req.user.id]
        );
        return res.json(current.rows[0] || null);
      }

      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const values = [req.user.id, ...keys.map((key) => profileData[key])];
      
      const result = await pool.query(
        `UPDATE profiles SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } else {
      const dataToInsert = { ...profileData, user_id: req.user.id };
      const keys = Object.keys(dataToInsert);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((key) => (dataToInsert as any)[key]);
      
      const result = await pool.query(
        `INSERT INTO profiles (${keys.join(', ')}, created_at, updated_at) 
         VALUES (${placeholders}, NOW(), NOW()) RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    }
  } catch (error: any) {
    console.error('Profile upsert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBSCRIPTION ROUTES ====================

app.get('/api/subscription-plans', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_ngn'
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subscriptions', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              sp.id as sp_id, sp.name as sp_name, sp.tier, sp.price_ngn, sp.features, 
              sp.max_scans_per_month, sp.includes_telehealth, sp.includes_custom_formulations, 
              sp.max_family_members
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    // Transform to nested format expected by frontend
    const row = result.rows[0];
    const subscription = {
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      status: row.status,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      scans_used_this_period: row.scans_used_this_period,
      subscription_plans: {
        id: row.sp_id,
        name: row.sp_name,
        tier: row.tier,
        price_ngn: row.price_ngn,
        features: row.features,
        max_scans_per_month: row.max_scans_per_month,
        includes_telehealth: row.includes_telehealth,
        includes_custom_formulations: row.includes_custom_formulations,
        max_family_members: row.max_family_members
      }
    };
    
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', authenticateToken, async (req: any, res) => {
  try {
    const { plan_id, status = 'active', current_period_start, current_period_end } = req.body || {};
    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    const planResult = await pool.query(
      'SELECT id FROM subscription_plans WHERE id = $1 AND is_active = true',
      [plan_id]
    );
    if (planResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive subscription plan' });
    }

    if (status === 'active') {
      await pool.query(
        `UPDATE subscriptions
         SET status = 'cancelled', updated_at = NOW()
         WHERE user_id = $1 AND status = 'active'`,
        [req.user.id]
      );
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, plan_id, status, current_period_start || null, current_period_end || null]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', async (req, res) => {
  try {
    const { type, category } = req.query;
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params: any[] = [];
    
    if (type && type !== 'all') {
      params.push(type);
      query += ` AND (product_type = $${params.length} OR product_type = 'both')`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, async (req: any, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid product fields were provided' });
    }

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((key) => payload[key]);
    const result = await pool.query(
      `INSERT INTO products (${keys.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, NOW(), NOW())
       RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid product fields were provided' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE products
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CART ROUTES ====================

app.get('/api/cart', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log(`[GET /api/cart] Fetching cart for user ${userId}`);
    
    const result = await pool.query(
      `SELECT ci.*, p.name, p.price_ngn, p.image_url, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [userId]
    );
    
    console.log(`[GET /api/cart] Found ${result.rows.length} items for user ${userId}`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('[GET /api/cart] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart', authenticateToken, async (req: any, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) 
       DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()
       RETURNING *`,
      [req.user.id, product_id, quantity]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cart/:id', authenticateToken, async (req: any, res) => {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:id', authenticateToken, async (req: any, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;
    
    console.log(`[DELETE /api/cart] Attempting to delete cart item ${itemId} for user ${userId}`);
    
    // First check if the item exists
    const checkResult = await pool.query(
      'SELECT id, user_id, product_id FROM cart_items WHERE id = $1 LIMIT 1',
      [itemId]
    );
    
    if (checkResult.rows.length === 0) {
      console.warn(`[DELETE /api/cart] Item ${itemId} not found in database`);
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    const cartItem = checkResult.rows[0];
    console.log(`[DELETE /api/cart] Found item: id=${cartItem.id}, user_id=${cartItem.user_id}, product_id=${cartItem.product_id}`);
    console.log(`[DELETE /api/cart] Auth user_id=${userId}`);
    
    if (cartItem.user_id !== userId) {
      console.warn(`[DELETE /api/cart] User mismatch! Item belongs to ${cartItem.user_id}, request from ${userId}`);
      return res.status(403).json({ error: 'Cannot delete cart item belonging to another user' });
    }
    
    // Now delete it
    const deleteResult = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );
    
    console.log(`[DELETE /api/cart] Delete query affected ${deleteResult.rowCount} rows`);
    
    if (deleteResult.rowCount === 0) {
      console.warn(`[DELETE /api/cart] Delete query affected 0 rows`);
      return res.status(500).json({ error: 'Failed to delete item - no rows affected' });
    }
    
    console.log(`[DELETE /api/cart] Successfully deleted item ${itemId}`);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('[DELETE /api/cart] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SCAN ROUTES ====================

// Get subscription status for scan limits
app.get('/api/scan-quota', authenticateToken, async (req: any, res) => {
  try {
    const subResult = await pool.query(
      `SELECT s.*, sp.max_scans_per_month, sp.name as plan_name, lower(sp.name) as tier
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active' AND sp.is_active = true
       LIMIT 1`,
      [req.user.id]
    );
    
    if (subResult.rows.length === 0) {
      // No active subscription - default to starter limits (3 scans)
      return res.json({
        hasSubscription: false,
        planName: 'Starter',
        tier: 'free',
        scansUsed: 0,
        maxScans: 3,
        scansRemaining: 3,
        isUnlimited: false
      });
    }
    
    const sub = subResult.rows[0];
    const isUnlimited = sub.max_scans_per_month === null;
    const scansRemaining = isUnlimited ? Infinity : Math.max(0, sub.max_scans_per_month - (sub.scans_used_this_period || 0));
    
    res.json({
      hasSubscription: true,
      planName: sub.plan_name,
      tier: sub.tier,
      scansUsed: sub.scans_used_this_period || 0,
      maxScans: sub.max_scans_per_month,
      scansRemaining: isUnlimited ? null : scansRemaining,
      isUnlimited
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scans', authenticateToken, parseScanUpload, async (req: any, res) => {
  try {
    // Check subscription quota before creating scan
    const subResult = await pool.query(
      `SELECT s.*, sp.max_scans_per_month
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active' AND sp.is_active = true
       LIMIT 1`,
      [req.user.id]
    );
    
    let maxScans = 3; // Default to starter limit
    let scansUsed = 0;
    let subscriptionId = null;
    
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      maxScans = sub.max_scans_per_month; // null means unlimited
      scansUsed = sub.scans_used_this_period || 0;
      subscriptionId = sub.id;
    }
    
    // Check if user has exceeded their scan limit (null = unlimited)
    if (maxScans !== null && scansUsed >= maxScans) {
      return res.status(403).json({ 
        error: 'Scan limit reached',
        message: 'You have used all your scans for this period. Upgrade your plan for unlimited scans.',
        scansUsed,
        maxScans
      });
    }
    
    const { calibration_data, porosity_test_result, image_url, multi_angle_urls, capture_info } = req.body;
    const scanType = normalizeScanType(req.body.scan_type);
    const imageUrl = req.file
      ? `/uploads/${scanType}-scans/${req.file.filename}`
      : (typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null);
    const multiAngleUrls =
      multi_angle_urls && typeof multi_angle_urls === 'object'
        ? multi_angle_urls
        : capture_info && typeof capture_info === 'object' && capture_info.image_urls && typeof capture_info.image_urls === 'object'
          ? capture_info.image_urls
          : null;
    
    const result = await pool.query(
      `INSERT INTO scans (user_id, scan_type, image_url, multi_angle_urls, calibration_data, porosity_test_result, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, scanType, imageUrl, multiAngleUrls, calibration_data, porosity_test_result]
    );
    
    // Increment scan usage counter
    if (subscriptionId) {
      await pool.query(
        `UPDATE subscriptions SET scans_used_this_period = COALESCE(scans_used_this_period, 0) + 1 WHERE id = $1`,
        [subscriptionId]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scans', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              json_agg(d.*) FILTER (WHERE d.id IS NOT NULL) as diagnoses
       FROM scans s
       LEFT JOIN diagnoses d ON s.id = d.scan_id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scans/:id', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              json_agg(d.*) FILTER (WHERE d.id IS NOT NULL) as diagnoses
       FROM scans s
       LEFT JOIN diagnoses d ON s.id = d.scan_id
       WHERE s.id = $1 AND s.user_id = $2
       GROUP BY s.id`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI ANALYSIS ROUTES ====================

app.post('/api/analyze/:type', authenticateToken, async (req: any, res) => {
  try {
    const { scanId } = req.body;
    const analysisType = req.params.type as 'skin' | 'hair';
    
    await pool.query("UPDATE scans SET status = 'analyzing' WHERE id = $1", [scanId]);
    
    const scanResult = await pool.query('SELECT * FROM scans WHERE id = $1', [scanId]);
    const scan = scanResult.rows[0];
    
    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    const profile = profileResult.rows[0];
    
    const imagePaths: string[] = [];
    if (scan.image_urls && Array.isArray(scan.image_urls)) {
      for (const url of scan.image_urls) {
        const localPath = url.replace(/^\//, './');
        imagePaths.push(localPath);
      }
    } else if (scan.image_url) {
      imagePaths.push(scan.image_url.replace(/^\//, './'));
    }
    
    console.log(`Starting AI analysis for ${analysisType} with ${imagePaths.length} images`);
    const analysis = await analyzeWithAI(analysisType, profile, imagePaths);
    console.log(`AI analysis complete in ${analysis.processing_time_ms}ms`);
    
    // Save diagnosis
    const diagnosisResult = await pool.query(
      `INSERT INTO diagnoses (scan_id, user_id, analysis_type, conditions, primary_condition, 
       confidence_score, severity, triage_level, skin_profile, hair_profile, ai_model_version, processing_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [scanId, req.user.id, analysisType, JSON.stringify(analysis.conditions), 
       analysis.primary_condition, analysis.confidence_score, analysis.severity,
       analysis.triage_level, JSON.stringify(analysis.skin_profile || null),
       JSON.stringify(analysis.hair_profile || null), 'gpt-4o', analysis.processing_time_ms]
    );
    
    // Create treatment plan
    await pool.query(
      `INSERT INTO treatment_plans (diagnosis_id, user_id, recommendations, 
       ingredients_to_use, ingredients_to_avoid, lifestyle_tips, follow_up_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [diagnosisResult.rows[0].id, req.user.id, analysis.recommendations,
       analysis.ingredients_to_use, analysis.ingredients_to_avoid, 
       analysis.lifestyle_tips, analysis.follow_up_days]
    );
    
    // Update scan status
    await pool.query("UPDATE scans SET status = 'completed' WHERE id = $1", [scanId]);
    
    // Get matching products
    const products = await pool.query(
      `SELECT * FROM products WHERE is_active = true AND product_type = $1 LIMIT 5`,
      [analysisType]
    );
    
    res.json({
      success: true,
      diagnosis: diagnosisResult.rows[0],
      products: products.rows
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLINICIAN ROUTES ====================

app.get('/api/clinicians', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.full_name
       FROM clinicians c
       JOIN profiles p ON c.user_id = p.user_id
       WHERE c.is_verified = true
       ORDER BY c.rating DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== APPOINTMENT ROUTES ====================

app.get('/api/appointments', authenticateToken, async (req: any, res) => {
  try {
    const clinicianResult = await pool.query(
      'SELECT id FROM clinicians WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );
    const clinicianId = clinicianResult.rows[0]?.id || null;

    const result = await pool.query(
      `SELECT a.*,
              json_build_object(
                'specialty', c.specialty,
                'profiles', json_build_object('full_name', cp.full_name)
              ) as clinicians,
              json_build_object('full_name', pp.full_name, 'age', pp.age) as profiles,
              json_build_object('image_url', s.image_url) as scans
       FROM appointments a
       JOIN clinicians c ON a.clinician_id = c.id
       LEFT JOIN profiles cp ON c.user_id = cp.user_id
       LEFT JOIN profiles pp ON a.patient_user_id = pp.user_id
       LEFT JOIN scans s ON a.scan_id = s.id
       WHERE a.patient_user_id = $1 OR ($2::uuid IS NOT NULL AND a.clinician_id = $2::uuid)
       ORDER BY a.scheduled_at DESC`,
      [req.user.id, clinicianId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-roles', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_roles WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authenticateToken, async (req: any, res) => {
  try {
    const { clinician_id, scheduled_at, duration_minutes = 30 } = req.body;
    
    let meetingUrl = null;
    
    // Try to create Daily room, but don't fail booking if it doesn't work
    try {
      const appointmentId = uuidv4().slice(0, 8);
      const room = await createDailyRoom({
        name: `imstev-${appointmentId}`,
        privacy: 'private',
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          max_participants: 2,
          exp: Math.floor(new Date(scheduled_at).getTime() / 1000) + (duration_minutes * 60) + 3600
        }
      });
      meetingUrl = room.url;
    } catch (roomError: any) {
      console.log('Video room creation skipped:', roomError.message);
      // Continue without video - appointment can still be booked
    }
    
    const result = await pool.query(
      `INSERT INTO appointments (patient_user_id, clinician_id, scheduled_at, duration_minutes, meeting_url, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [req.user.id, clinician_id, scheduled_at, duration_minutes, meetingUrl]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req: any, res) => {
  try {
    const allowedFields = ['status', 'notes', 'prescription', 'follow_up_date'];
    const payload = req.body || {};
    const keys = Object.keys(payload).filter((key) => allowedFields.includes(key));

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid appointment fields were provided' });
    }

    const appointmentResult = await pool.query(
      'SELECT id, patient_user_id, clinician_id FROM appointments WHERE id = $1',
      [req.params.id]
    );
    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentResult.rows[0];
    const clinicianOwnerResult = await pool.query(
      'SELECT id FROM clinicians WHERE id = $1 AND user_id = $2',
      [appointment.clinician_id, req.user.id]
    );

    const isPatient = appointment.patient_user_id === req.user.id;
    const isClinician = clinicianOwnerResult.rows.length > 0;
    if (!isPatient && !isClinician) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE appointments
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments/:id/join', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const apptResult = await pool.query(
      `SELECT a.*, p.full_name as patient_name
       FROM appointments a
       JOIN profiles p ON a.patient_user_id = p.user_id
       WHERE a.id = $1`,
      [id]
    );
    
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = apptResult.rows[0];
    
    if (appointment.patient_user_id !== req.user.id) {
      const clinicianCheck = await pool.query(
        'SELECT * FROM clinicians WHERE user_id = $1 AND id = $2',
        [req.user.id, appointment.clinician_id]
      );
      if (clinicianCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to join this appointment' });
      }
    }
    
    const profileResult = await pool.query('SELECT full_name FROM profiles WHERE user_id = $1', [req.user.id]);
    const userName = profileResult.rows[0]?.full_name || req.user.email;
    
    const roomName = appointment.meeting_url.split('/').pop();
    const isOwner = appointment.patient_user_id !== req.user.id;
    
    const token = await createMeetingToken(roomName, userName, isOwner);
    
    res.json({
      meeting_url: appointment.meeting_url,
      token,
      room_name: roomName,
      appointment
    });
  } catch (error: any) {
    console.error('Join appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FAMILY ACCOUNTS ROUTES ====================

app.get('/api/family-accounts', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT fa.*,
              json_build_object('full_name', p.full_name, 'age', p.age) as profiles
       FROM family_accounts fa
       JOIN profiles p ON fa.child_user_id = p.user_id
       WHERE fa.parent_user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/family-accounts', authenticateToken, async (req: any, res) => {
  try {
    const { child_user_id, relationship } = req.body || {};
    if (!child_user_id || !relationship) {
      return res.status(400).json({ error: 'child_user_id and relationship are required' });
    }
    if (child_user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot add yourself as a dependent' });
    }

    const childUserResult = await pool.query('SELECT id FROM users WHERE id = $1', [child_user_id]);
    if (childUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child account not found' });
    }

    const subResult = await pool.query(
      `SELECT sp.max_family_members
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const maxFamilyMembers = subResult.rows[0]?.max_family_members ?? 1;
    const currentMembersResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM family_accounts WHERE parent_user_id = $1',
      [req.user.id]
    );
    const currentMembers = currentMembersResult.rows[0]?.count ?? 0;
    const allowedDependents =
      maxFamilyMembers === null ? Number.MAX_SAFE_INTEGER : Math.max(0, maxFamilyMembers - 1);

    if (currentMembers >= allowedDependents) {
      return res.status(403).json({ error: 'Family member limit reached for your current plan' });
    }

    const insertResult = await pool.query(
      `INSERT INTO family_accounts (parent_user_id, child_user_id, relationship)
       VALUES ($1, $2, $3)
       ON CONFLICT (parent_user_id, child_user_id)
       DO UPDATE SET relationship = EXCLUDED.relationship
       RETURNING *`,
      [req.user.id, child_user_id, relationship]
    );

    const result = await pool.query(
      `SELECT fa.*,
              json_build_object('full_name', p.full_name, 'age', p.age) as profiles
       FROM family_accounts fa
       LEFT JOIN profiles p ON p.user_id = fa.child_user_id
       WHERE fa.id = $1`,
      [insertResult.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/family-accounts/:id', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM family_accounts
       WHERE id = $1 AND parent_user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOM FORMULATIONS ROUTES ====================

app.get('/api/formulations', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM custom_formulations WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/custom-formulations', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM custom_formulations WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/formulations/generate', authenticateToken, async (req: any, res) => {
  try {
    const { diagnosis_id } = req.body;
    
    // Get diagnosis
    const diagResult = await pool.query('SELECT * FROM diagnoses WHERE id = $1', [diagnosis_id]);
    const diagnosis = diagResult.rows[0];
    
    // Generate formulation (simulated - can integrate with AI)
    const formulation = {
      formulation_name: `Custom ${diagnosis.analysis_type === 'hair' ? 'Hair' : 'Skin'} Treatment`,
      ingredients: {
        'Active Ingredient 1': 2,
        'Active Ingredient 2': 1.5,
        'Base Cream': 85,
        'Preservative': 0.5,
        'Essential Oil': 1
      },
      instructions: 'Apply to affected areas twice daily. Perform patch test before first use.',
      expected_benefits: ['Improved condition', 'Better hydration', 'Reduced symptoms'],
      contraindications: 'Avoid if pregnant or nursing. Do not use on broken skin.',
      estimated_cost_ngn: 8500
    };
    
    const result = await pool.query(
      `INSERT INTO custom_formulations (user_id, diagnosis_id, formulation_name, ingredients, 
       instructions, expected_benefits, contraindications, estimated_cost_ngn)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, diagnosis_id, formulation.formulation_name, JSON.stringify(formulation.ingredients),
       formulation.instructions, JSON.stringify(formulation.expected_benefits), 
       formulation.contraindications, formulation.estimated_cost_ngn]
    );
    
    res.json({ formulation: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ROUTES ====================

app.get('/api/orders', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'id', oi.id,
                'quantity', oi.quantity,
                'price_at_purchase', oi.price_at_purchase,
                'product_name', p.name
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', authenticateToken, async (req: any, res) => {
  try {
    const { shipping_address, payment_method, payment_status, shipping_fee_ngn } = req.body;
    
    // Get cart items
    const cartResult = await pool.query(
      `SELECT ci.*, p.price_ngn
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    
    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate total
    const subtotal = cartResult.rows.reduce((sum, item) => sum + (item.price_ngn * item.quantity), 0);
    const shippingFee = Number.isFinite(Number(shipping_fee_ngn)) && Number(shipping_fee_ngn) >= 0
      ? Number(shipping_fee_ngn)
      : 0;
    const total = subtotal + shippingFee;
    
    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount_ngn, shipping_address, payment_method, payment_status, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        req.user.id,
        total,
        JSON.stringify(shipping_address),
        payment_method,
        typeof payment_status === 'string' && payment_status.trim() ? payment_status.trim() : 'pending',
      ]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items
    for (const item of cartResult.rows) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price_ngn]
      );
    }
    
    // Clear cart
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DIAGNOSES ROUTES ====================

app.get('/api/diagnoses', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, s.image_url, s.scan_type
       FROM diagnoses d
       JOIN scans s ON d.scan_id = s.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/treatment-plans', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM treatment_plans WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALON BOOKING ROUTES ====================

// Salon services list - IMSTEV NATURALS Price List
const SALON_SERVICES = [
  // HAIRDO - Basic Services
  { id: 'loosening-hair', name: 'Loosening of Hair', category: 'Hairdo', duration: 60, price: 1000, priceMax: 8000 },
  { id: 'blow-drying', name: 'Blow Drying', category: 'Hairdo', duration: 30, price: 1500 },
  { id: 'retouching', name: 'Retouching', category: 'Hairdo', duration: 60, price: 3000 },
  
  // HAIRDO - Dyeing/Colouring
  { id: 'dyeing-client-colour', name: 'Dyeing/Colouring (Client Colour)', category: 'Colouring', duration: 90, price: 1500 },
  { id: 'dyeing-salon-colour', name: 'Dyeing/Colouring (Salon Product)', category: 'Colouring', duration: 90, price: 3000 },
  
  // HAIRDO - Natural Twist
  { id: 'natural-twist-jumbo', name: 'Natural Twist - Jumbo Size', category: 'Twists', duration: 90, price: 2000 },
  { id: 'natural-twist-medium', name: 'Natural Twist - Medium Size', category: 'Twists', duration: 120, price: 3000 },
  { id: 'natural-twist-small', name: 'Natural Twist - Small Size', category: 'Twists', duration: 180, price: 5000 },
  
  // HAIRDO - Kinky Twist
  { id: 'kinky-twist-jumbo', name: 'Kinky Twist - Jumbo Size', category: 'Twists', duration: 120, price: 3500 },
  { id: 'kinky-twist-medium', name: 'Kinky Twist - Medium Size', category: 'Twists', duration: 180, price: 4500 },
  { id: 'kinky-twist-small', name: 'Kinky Twist - Small Size', category: 'Twists', duration: 300, price: 12000 },
  
  // HAIRDO - Braids
  { id: 'braids-jumbo', name: 'Braids - Jumbo Size', category: 'Braiding', duration: 120, price: 3000 },
  { id: 'braids-medium', name: 'Braids - Medium Size', category: 'Braiding', duration: 180, price: 4500 },
  { id: 'braids-small', name: 'Braids - Small Size', category: 'Braiding', duration: 240, price: 6000 },
  { id: 'cornrows-didi', name: 'Cornrows / Didi', category: 'Braiding', duration: 90, price: 1000, priceMax: 3000 },
  { id: 'threading', name: 'Threading', category: 'Braiding', duration: 120, price: 4000, priceMax: 6000 },
  { id: 'crochet', name: 'Crochet', category: 'Braiding', duration: 120, price: 4000, priceMax: 6000 },
  
  // HAIRDO - Locs
  { id: 'relocking-dread', name: 'Relocking of Dreadlocks', category: 'Locs', duration: 90, price: 5000 },
  { id: 'relocking-micro-sister', name: 'Relocking of Microlocs & Sisterlocs', category: 'Locs', duration: 120, price: 8000 },
  { id: 'install-dreadlocks', name: 'Installation of Dreadlocks', category: 'Locs', duration: 300, price: 15000, priceMax: 20000 },
  { id: 'install-microlocs', name: 'Installation of Microlocs', category: 'Locs', duration: 420, price: 25000, priceMax: 35000 },
  { id: 'install-sisterlocs', name: 'Installation of Sisterlocs', category: 'Locs', duration: 480, price: 35000, priceMax: 40000 },
  
  // HAIRDO - Premium/Bridal
  { id: 'bridal-packing', name: 'Bridal Packing', category: 'Premium', duration: 180, price: 1500, priceMax: 25000 },
  
  // TREATMENT - Washing
  { id: 'wash-client-products', name: 'Washing (Client Products)', category: 'Treatment', duration: 30, price: 1200 },
  { id: 'wash-treatment-short', name: 'Washing & Treatment - Short Hair', category: 'Treatment', duration: 45, price: 4200 },
  { id: 'wash-treatment-long', name: 'Washing & Treatment - Long Hair', category: 'Treatment', duration: 60, price: 5200 },
  
  // TREATMENT - Deep Conditioning
  { id: 'deep-conditioning-short', name: 'Deep Conditioning - Short Hair', category: 'Treatment', duration: 45, price: 1000 },
  { id: 'deep-conditioning-long', name: 'Deep Conditioning - Long Hair', category: 'Treatment', duration: 60, price: 1500 },
  
  // TREATMENT - Leave-in
  { id: 'leave-in-short', name: 'Leave-in Treatment - Short Hair', category: 'Treatment', duration: 30, price: 1000 },
  { id: 'leave-in-long', name: 'Leave-in Treatment - Long Hair', category: 'Treatment', duration: 45, price: 1500 },
  
  // TREATMENT - Other Treatments
  { id: 'protein-treatment', name: 'Protein Treatment', category: 'Treatment', duration: 60, price: 1000 },
  { id: 'clay-mask', name: 'Clay Mask Treatment', category: 'Treatment', duration: 45, price: 1000 },
  { id: 'butter-treatment-long', name: 'Butter Treatment - Long Hair', category: 'Treatment', duration: 30, price: 1000 },
  { id: 'butter-treatment-short', name: 'Butter Treatment - Short Hair', category: 'Treatment', duration: 30, price: 500 },
  { id: 'hair-growth-solution', name: 'Hair Growth Solution', category: 'Treatment', duration: 30, price: 500 },
  { id: 'aloe-vera-treatment', name: 'Aloe Vera Treatment', category: 'Treatment', duration: 30, price: 500 },
  { id: 'flaxseed-treatment', name: 'Flaxseed Treatment', category: 'Treatment', duration: 30, price: 500 },
  { id: 'rice-water-treatment', name: 'Rice Water Treatment', category: 'Treatment', duration: 30, price: 500 },
  { id: 'acv-treatment', name: 'ACV Treatment', category: 'Treatment', duration: 20, price: 500 },
  { id: 'fenugreek-treatment', name: 'Fenugreek Treatment', category: 'Treatment', duration: 30, price: 500 },
  { id: 'serum-oil', name: 'Serum / Oil Application', category: 'Treatment', duration: 15, price: 500 },
  { id: 'mousse-application', name: 'Mousse Application', category: 'Treatment', duration: 15, price: 500 },
  { id: 'shampoo', name: 'Shampoo', category: 'Treatment', duration: 15, price: 500 },
  { id: 'soda-treatment', name: 'Soda Treatment', category: 'Treatment', duration: 20, price: 500 },
  
  // BONUS - Free with other services
  { id: 'scalp-massage', name: 'Scalp Massage (Bonus)', category: 'Bonus', duration: 15, price: 0 },
  { id: 'trimming', name: 'Trimming (Bonus)', category: 'Bonus', duration: 15, price: 0 },
  { id: 'heat-cap', name: 'Heat Cap (Bonus)', category: 'Bonus', duration: 20, price: 0 },
  
  // Consultation
  { id: 'consultation', name: 'Hair Consultation', category: 'Consultation', duration: 30, price: 12000 },
];

// Time slots configuration
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const SALON_OPENING_SLOT = '14:00';
const MONDAY_DAY_INDEX = 1;

const getSalonSlotsForDate = (dateInput: string) => {
  const appointmentDate = new Date(`${dateInput}T00:00:00`);
  const dayOfWeek = appointmentDate.getDay();

  if (Number.isNaN(appointmentDate.getTime()) || dayOfWeek === MONDAY_DAY_INDEX) {
    return [] as string[];
  }

  const openingSlotIndex = TIME_SLOTS.indexOf(SALON_OPENING_SLOT);
  return openingSlotIndex >= 0 ? TIME_SLOTS.slice(openingSlotIndex) : [];
};

// Get salon services
app.get('/api/salon/services', (req, res) => {
  res.json(SALON_SERVICES);
});

// Get available time slots for a specific date
app.get('/api/salon/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const daySlots = getSalonSlotsForDate(String(date));
    if (!daySlots.length) {
      return res.json({
        date,
        availableSlots: [],
        bookedSlots: [],
        totalSlots: 0
      });
    }

    // Get booked slots for this date
    const bookedResult = await pool.query(
      `SELECT time_slot, duration_minutes FROM salon_appointments 
       WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no-show')`,
      [date]
    );

    const bookedSlots = bookedResult.rows.map(row => row.time_slot);

    // Calculate blocked time slots based on duration
    const blockedSlots = new Set<string>();
    bookedResult.rows.forEach(booking => {
      const startIdx = daySlots.indexOf(booking.time_slot);
      if (startIdx >= 0) {
        const slotsNeeded = Math.ceil(booking.duration_minutes / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          if (daySlots[startIdx + i]) {
            blockedSlots.add(daySlots[startIdx + i]);
          }
        }
      }
    });

    const availableSlots = daySlots.filter(slot => !blockedSlots.has(slot));

    res.json({ 
      date, 
      availableSlots, 
      bookedSlots: Array.from(blockedSlots),
      totalSlots: daySlots.length 
    });
  } catch (error: any) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get booked dates for calendar (show dates with limited/no availability)
app.get('/api/salon/booked-dates', async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT appointment_date, COUNT(*) as booking_count 
       FROM salon_appointments 
       WHERE appointment_date >= $1 AND appointment_date <= $2 
       AND status NOT IN ('cancelled', 'no-show')
       GROUP BY appointment_date`,
      [startDate, endDate]
    );

    const bookedDates: { [key: string]: { count: number; status: string } } = {};
    result.rows.forEach(row => {
      const count = parseInt(row.booking_count);
      bookedDates[row.appointment_date.toISOString().split('T')[0]] = {
        count,
        status: count >= TIME_SLOTS.length * 0.8 ? 'full' : count >= TIME_SLOTS.length * 0.5 ? 'limited' : 'available'
      };
    });

    res.json(bookedDates);
  } catch (error: any) {
    console.error('Get booked dates error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optional auth middleware for booking (allows both authenticated and guest users)
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    if (!SESSION_SECRET) {
      if (!hasWarnedOptionalAuthSecret) {
        console.warn('Skipping optional auth token verification because SESSION_SECRET is missing.');
        hasWarnedOptionalAuthSecret = true;
      }
      return next();
    }

    jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// ==================== COMMUNITY ROUTES ====================

app.get('/api/community/posts', optionalAuth, async (req: any, res) => {
  try {
    const community = normalizeCommunityType(req.query?.community);
    const limitInput = Number(req.query?.limit || 50);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(1, limitInput), 100) : 50;
    const currentUserId = req.user?.id || null;

    const postsResult = await pool.query(
      `SELECT id, user_id, community_type, author_name, author_role, content, image_url, created_at
       FROM app_community_posts
       WHERE community_type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [community, limit]
    );
    const posts = postsResult.rows || [];
    if (!posts.length) {
      return res.json({ posts: [] });
    }

    const postIds = posts.map((post: any) => post.id);
    const commentsResult = await pool.query(
      `SELECT id, post_id, parent_comment_id, user_id, author_name, content, created_at
       FROM app_community_comments
       WHERE post_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [postIds]
    );
    const comments = commentsResult.rows || [];
    const commentIds = comments.map((comment: any) => comment.id);

    const postReactionsResult = await pool.query(
      `SELECT post_id, user_id, reaction
       FROM app_community_reactions
       WHERE post_id = ANY($1::uuid[]) AND comment_id IS NULL`,
      [postIds]
    );
    const postReactions = postReactionsResult.rows || [];

    const commentReactions = commentIds.length
      ? (await pool.query(
        `SELECT comment_id, user_id, reaction
         FROM app_community_reactions
         WHERE comment_id = ANY($1::uuid[]) AND post_id IS NULL`,
        [commentIds]
      )).rows
      : [];

    const postStatsMap = new Map<string, { likes: number; loves: number; userReaction: 'like' | 'love' | null }>();
    for (const row of postReactions) {
      const current = postStatsMap.get(row.post_id) || { likes: 0, loves: 0, userReaction: null };
      if (row.reaction === 'like') current.likes += 1;
      if (row.reaction === 'love') current.loves += 1;
      if (currentUserId && row.user_id === currentUserId) current.userReaction = row.reaction;
      postStatsMap.set(row.post_id, current);
    }

    const commentStatsMap = new Map<string, { likes: number; loves: number; userReaction: 'like' | 'love' | null }>();
    for (const row of commentReactions) {
      const current = commentStatsMap.get(row.comment_id) || { likes: 0, loves: 0, userReaction: null };
      if (row.reaction === 'like') current.likes += 1;
      if (row.reaction === 'love') current.loves += 1;
      if (currentUserId && row.user_id === currentUserId) current.userReaction = row.reaction;
      commentStatsMap.set(row.comment_id, current);
    }

    const topLevelByPost = new Map<string, any[]>();
    const repliesByParent = new Map<string, any[]>();

    for (const row of comments) {
      const stats = commentStatsMap.get(row.id) || { likes: 0, loves: 0, userReaction: null };
      const normalized = {
        id: row.id,
        author: row.author_name,
        content: row.content,
        createdAt: row.created_at,
        likes: stats.likes,
        loves: stats.loves,
        userReaction: stats.userReaction,
        replies: [] as any[],
      };

      if (row.parent_comment_id) {
        const bucket = repliesByParent.get(row.parent_comment_id) || [];
        bucket.push(normalized);
        repliesByParent.set(row.parent_comment_id, bucket);
      } else {
        const bucket = topLevelByPost.get(row.post_id) || [];
        bucket.push(normalized);
        topLevelByPost.set(row.post_id, bucket);
      }
    }

    for (const commentsForPost of topLevelByPost.values()) {
      for (const comment of commentsForPost) {
        comment.replies = repliesByParent.get(comment.id) || [];
      }
    }

    const formattedPosts = posts.map((post: any) => {
      const stats = postStatsMap.get(post.id) || { likes: 0, loves: 0, userReaction: null };
      return {
        id: post.id,
        community: post.community_type,
        author: post.author_name,
        authorRole: post.author_role,
        content: post.content,
        imageUrl: post.image_url || null,
        createdAt: post.created_at,
        likes: stats.likes,
        loves: stats.loves,
        userReaction: stats.userReaction,
        comments: topLevelByPost.get(post.id) || [],
      };
    });

    res.json({ posts: formattedPosts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/posts', authenticateToken, async (req: any, res) => {
  try {
    const communityType = normalizeCommunityType(req.body?.communityType);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    const rawAuthorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
    if (!content && !imageUrl) return res.status(400).json({ error: 'Add text or an image to create a post' });
    if (content.length > 2000) return res.status(400).json({ error: 'Post is too long (max 2000 characters)' });

    const authorName = rawAuthorName || defaultCommunityAuthor(req.user?.email);
    const authorRole = communityType === 'hair' ? 'Hair Journey Member' : 'Skin Journey Member';

    const insertResult = await pool.query(
      `INSERT INTO app_community_posts (user_id, community_type, author_name, author_role, content, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.user.id, communityType, authorName, authorRole, content, imageUrl || null]
    );

    res.json({ success: true, id: insertResult.rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/upload-image', authenticateToken, async (req: any, res) => {
  try {
    const communityType = normalizeCommunityType(req.body?.communityType);
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim().toLowerCase() : 'image/jpeg';
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64.trim() : '';

    if (!base64) {
      return res.status(400).json({ error: 'Image payload is required' });
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
      return res.status(400).json({ error: 'Only JPG, PNG, WEBP, and GIF images are allowed' });
    }

    const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
    const bytes = Buffer.from(normalized, 'base64');
    const maxSizeBytes = 10 * 1024 * 1024;
    if (bytes.length > maxSizeBytes) {
      return res.status(400).json({ error: 'Image is too large. Maximum size is 10MB.' });
    }

    const extension = normalizeCommunityFileExtension(contentType, fileName);
    const safeName = `${Date.now()}-${uuidv4()}${extension}`;
    const relativePath = path.join('community', communityType, req.user.id, safeName).replace(/\\/g, '/');
    const absolutePath = path.join(uploadsDir, relativePath);
    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, bytes);
    const publicUrl = `${getApiBaseUrl()}/uploads/${relativePath}`.replace(/([^:]\/)\/+/g, '$1');
    return res.json({
      success: true,
      path: relativePath,
      publicUrl,
      contentType,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

app.post('/api/community/comments', authenticateToken, async (req: any, res) => {
  try {
    const postId = typeof req.body?.postId === 'string' ? req.body.postId.trim() : '';
    const parentCommentId = typeof req.body?.parentCommentId === 'string' ? req.body.parentCommentId.trim() : null;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const rawAuthorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';

    if (!postId || !content) return res.status(400).json({ error: 'postId and content are required' });
    if (content.length > 1000) return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });

    const postExists = await pool.query('SELECT id FROM app_community_posts WHERE id = $1 LIMIT 1', [postId]);
    if (!postExists.rows.length) return res.status(404).json({ error: 'Post not found' });

    if (parentCommentId) {
      const parent = await pool.query(
        `SELECT id, post_id, parent_comment_id
         FROM app_community_comments
         WHERE id = $1
         LIMIT 1`,
        [parentCommentId]
      );
      if (!parent.rows.length || parent.rows[0].post_id !== postId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
      if (parent.rows[0].parent_comment_id) {
        return res.status(400).json({ error: 'Replies can only be added to top-level comments' });
      }
    }

    const authorName = rawAuthorName || defaultCommunityAuthor(req.user?.email);
    const insertResult = await pool.query(
      `INSERT INTO app_community_comments (post_id, parent_comment_id, user_id, author_name, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [postId, parentCommentId, req.user.id, authorName, content]
    );

    res.json({ success: true, id: insertResult.rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/reactions', authenticateToken, async (req: any, res) => {
  try {
    const postId = typeof req.body?.postId === 'string' ? req.body.postId.trim() : '';
    const commentId = typeof req.body?.commentId === 'string' ? req.body.commentId.trim() : '';
    const reaction = normalizeCommunityReaction(req.body?.reaction);

    if (!reaction) return res.status(400).json({ error: 'reaction must be like or love' });
    if ((postId && commentId) || (!postId && !commentId)) {
      return res.status(400).json({ error: 'Provide either postId or commentId' });
    }

    const existing = postId
      ? await pool.query(
        `SELECT id, reaction
         FROM app_community_reactions
         WHERE user_id = $1 AND post_id = $2 AND comment_id IS NULL
         LIMIT 1`,
        [req.user.id, postId]
      )
      : await pool.query(
        `SELECT id, reaction
         FROM app_community_reactions
         WHERE user_id = $1 AND comment_id = $2 AND post_id IS NULL
         LIMIT 1`,
        [req.user.id, commentId]
      );

    const existingReaction = existing.rows[0];
    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        await pool.query('DELETE FROM app_community_reactions WHERE id = $1', [existingReaction.id]);
        return res.json({ success: true, state: 'removed' });
      }

      await pool.query(
        'UPDATE app_community_reactions SET reaction = $1, updated_at = NOW() WHERE id = $2',
        [reaction, existingReaction.id]
      );
      return res.json({ success: true, state: 'updated' });
    }

    await pool.query(
      `INSERT INTO app_community_reactions (user_id, post_id, comment_id, reaction)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, postId || null, commentId || null, reaction]
    );

    res.json({ success: true, state: 'added' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create salon booking
app.post('/api/salon/book', optionalAuth, async (req: any, res) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      serviceId, 
      serviceIds,
      appointmentDate, 
      timeSlot, 
      notes 
    } = req.body;

    const normalizedServiceIds = Array.from(new Set(Array.isArray(serviceIds)
      ? serviceIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : (typeof serviceId === 'string' && serviceId.trim() ? [serviceId] : [])));

    // Validate required fields
    if (!customerName || !customerPhone || !normalizedServiceIds.length || !appointmentDate || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const selectedServices = normalizedServiceIds
      .map((id: string) => SALON_SERVICES.find((service) => service.id === id))
      .filter((service): service is typeof SALON_SERVICES[number] => Boolean(service));

    if (selectedServices.length !== normalizedServiceIds.length) {
      return res.status(400).json({ error: 'Invalid service' });
    }

    const totalDuration = selectedServices.reduce((sum, service) => sum + Number(service.duration || 0), 0);
    const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const serviceName = selectedServices.map((service) => service.name).join(', ');
    const serviceType = Array.from(new Set(selectedServices.map((service) => service.category))).join(', ');
    const daySlots = getSalonSlotsForDate(appointmentDate);

    if (!daySlots.length) {
      return res.status(400).json({ error: 'Salon appointments are not available on Mondays.' });
    }

    if (!daySlots.includes(timeSlot)) {
      return res.status(400).json({ error: 'Selected time slot is outside salon opening hours.' });
    }

    // Check if slot is still available
    const existingBooking = await pool.query(
      `SELECT id FROM salon_appointments 
       WHERE appointment_date = $1 AND time_slot = $2 
       AND status NOT IN ('cancelled', 'no-show')`,
      [appointmentDate, timeSlot]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Create booking
    const isRegisteredUser = !!req.user;
    const result = await pool.query(
      `INSERT INTO salon_appointments 
       (customer_name, customer_email, customer_phone, user_id, service_type, service_name, 
        appointment_date, time_slot, duration_minutes, price_ngn, notes, is_registered_user, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        customerName, customerEmail || null, customerPhone, 
        req.user?.id || null, serviceType, serviceName,
        appointmentDate, timeSlot, totalDuration, totalPrice,
        notes || null, isRegisteredUser, 'confirmed'
      ]
    );

    res.json({ 
      success: true, 
      booking: result.rows[0],
      message: 'Appointment booked successfully!'
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's appointments (for logged-in users)
app.get('/api/salon/my-appointments', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM salon_appointments 
       WHERE user_id = $1 
       ORDER BY appointment_date DESC, time_slot DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel appointment
app.post('/api/salon/cancel/:id', optionalAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership for authenticated users, or phone ownership for guests
    let query = 'UPDATE salon_appointments SET status = $1, updated_at = NOW() WHERE id = $2';
    const params: any[] = ['cancelled', id];
    
    if (req.user) {
      query += ' AND user_id = $3';
      params.push(req.user.id);
    } else {
      const normalizedPhone = normalizePhoneNumber(req.body?.customerPhone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'customerPhone is required for guest cancellation' });
      }
      query += " AND regexp_replace(customer_phone, '[^0-9]', '', 'g') = $3";
      params.push(normalizedPhone);
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    }
    
    res.json({ success: true, appointment: result.rows[0] });
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get priority time slots for registered users (earlier slots)
app.get('/api/salon/priority-slots', authenticateToken, async (req: any, res) => {
  try {
    const { date, serviceId } = req.query;
    
    const service = SALON_SERVICES.find(s => s.id === serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Invalid service' });
    }

    const daySlots = getSalonSlotsForDate(String(date));
    if (!daySlots.length) {
      return res.json({
        prioritySlots: [],
        regularSlots: [],
        allAvailable: [],
        isRegisteredUser: true
      });
    }

    // Get booked slots
    const bookedResult = await pool.query(
      `SELECT time_slot, duration_minutes FROM salon_appointments 
       WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no-show')`,
      [date]
    );

    const blockedSlots = new Set<string>();
    bookedResult.rows.forEach(booking => {
      const startIdx = daySlots.indexOf(booking.time_slot);
      if (startIdx >= 0) {
        const slotsNeeded = Math.ceil(booking.duration_minutes / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          if (daySlots[startIdx + i]) {
            blockedSlots.add(daySlots[startIdx + i]);
          }
        }
      }
    });

    // For registered users, prioritize morning slots (first 6 available)
    const availableSlots = daySlots.filter(slot => !blockedSlots.has(slot));
    const prioritySlots = availableSlots.slice(0, 6);
    const regularSlots = availableSlots.slice(6);

    res.json({ 
      prioritySlots, 
      regularSlots,
      allAvailable: availableSlots,
      isRegisteredUser: true
    });
  } catch (error: any) {
    console.error('Get priority slots error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== QUICKTELLER PAYMENT ROUTES ====================

// Debug endpoint to check Quickteller configuration
app.get('/api/payment/config-check', (req: any, res) => {
  try {
    const hasClientId = !!process.env.QUICKTELLER_CLIENT_ID?.trim();
    const hasClientSecret = !!process.env.QUICKTELLER_CLIENT_SECRET?.trim();
    const hasMerchantCode = !!process.env.QUICKTELLER_MERCHANT_CODE?.trim();
    const hasPaymentItemId = !!process.env.QUICKTELLER_PAYMENT_ITEM_ID?.trim();
    
    res.json({
      hasClientId,
      hasClientSecret,
      hasMerchantCode,
      hasPaymentItemId,
      allConfigured: hasClientId && hasClientSecret && hasMerchantCode && hasPaymentItemId,
      env: process.env.QUICKTELLER_ENV || 'not set',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

type PaymentType = 'general' | 'salon_booking' | 'subscription' | 'telehealth' | 'order' | 'analysis';

function normalizePaymentType(value: unknown): PaymentType {
  if (typeof value !== 'string') return 'general';
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'salon_booking' ||
    normalized === 'subscription' ||
    normalized === 'telehealth' ||
    normalized === 'order' ||
    normalized === 'analysis'
  ) {
    return normalized;
  }
  return 'general';
}

async function getOrCreateMonthlyScanPlan(pool: Pool) {
  const existing = await pool.query(
    `SELECT id, name, price_ngn, max_scans_per_month, is_active
     FROM subscription_plans
     WHERE is_active = true AND price_ngn = 10000 AND max_scans_per_month = 4
     ORDER BY created_at DESC
     LIMIT 1`
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    `INSERT INTO subscription_plans
      (name, tier, price_ngn, features, max_scans_per_month, max_family_members, includes_telehealth, includes_custom_formulations, is_active)
     VALUES
      ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, true)
     RETURNING id, name, price_ngn, max_scans_per_month, is_active`,
    [
      'Monthly Scan Plan',
      'premium',
      10000,
      JSON.stringify([
        '4 scans every 30 days',
        'Priority analysis processing',
        'Detailed recommendations',
        'Progress tracking'
      ]),
      4,
      1,
      false,
      false,
    ]
  );

  return created.rows[0];
}

function normalizeMetadata(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
}

// Initialize payment - returns hosted and inline checkout configs
app.post('/api/payment/initialize', optionalAuth, async (req: any, res) => {
  try {
    const {
      amount,
      customerEmail,
      customerName,
      customerPhone,
      description,
      bookingId,
      planId,
      paymentType,
      metadata,
      redirectPath,
    } = req.body || {};
    let resolvedDescription = typeof description === 'string' ? description : '';

    const normalizedType = normalizePaymentType(paymentType || (bookingId ? 'salon_booking' : 'general'));

    if (!customerEmail || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'Missing required payment details (email, name, or phone)' });
    }

    let amountToCharge = Number(amount);
    let resolvedPlanId: string | null = null;

    if (normalizedType === 'subscription') {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication is required for subscription payments' });
      }
      const plan = planId
        ? (await pool.query(
            'SELECT id, name, price_ngn, is_active, max_scans_per_month FROM subscription_plans WHERE id = $1 LIMIT 1',
            [planId]
          )).rows[0]
        : await getOrCreateMonthlyScanPlan(pool);
      if (!plan || !plan.is_active) {
        return res.status(400).json({ error: 'Invalid or inactive subscription plan' });
      }
      amountToCharge = Number(plan.price_ngn);
      resolvedPlanId = plan.id;

      if (!resolvedDescription) {
        resolvedDescription = `Subscription: ${plan.name}`;
      }
    }

    if (normalizedType === 'analysis') {
      const resolvedScanId =
        typeof req.body?.scanId === 'string' ? req.body.scanId.trim()
        : typeof metadata?.scanId === 'string' ? String(metadata.scanId).trim()
        : '';
      if (!resolvedScanId) {
        return res.status(400).json({ error: 'scanId is required for analysis payments' });
      }
      if (resolvedScanId) {
        const scanResult = await pool.query(
          'SELECT id, user_id FROM scans WHERE id = $1 LIMIT 1',
          [resolvedScanId]
        );
        if (scanResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid scan for analysis payment' });
        }
        if (req.user?.id && scanResult.rows[0].user_id !== req.user.id) {
          return res.status(400).json({ error: 'Invalid scan for analysis payment' });
        }
      }
      if (!resolvedDescription) {
        resolvedDescription = 'Analysis results unlock';
      }
    }

    if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const redirectUrl =
      typeof redirectPath === 'string' && (redirectPath.startsWith('http://') || redirectPath.startsWith('https://'))
        ? redirectPath
        : `${getApiBaseUrl()}${
            typeof redirectPath === 'string' && redirectPath.startsWith('/')
              ? redirectPath
              : '/api/payment/callback'
          }`;
    const transactionRef = generateTransactionRef();
    const metadataPayload = {
      ...normalizeMetadata(metadata),
      description: resolvedDescription || null,
      initializedAt: new Date().toISOString(),
    };

    const paymentInit = await initializePayment({
      amount: amountToCharge,
      customerEmail,
      customerName,
      customerPhone,
      transactionRef,
      redirectUrl,
      description: resolvedDescription || undefined,
    });

    if (!paymentInit.success || !paymentInit.inlineConfig) {
      console.error('Payment initialization failed:', paymentInit.error);
      return res.status(500).json({ error: paymentInit.error || 'Unable to initialize payment' });
    }

    // Store payment intent in database
    await pool.query(
      `INSERT INTO payment_transactions (
        transaction_ref, payment_type, amount, customer_email, customer_name, customer_phone,
        booking_id, plan_id, metadata, status, user_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
      [
        transactionRef,
        normalizedType,
        amountToCharge,
        customerEmail,
        customerName,
        customerPhone,
        bookingId || null,
        resolvedPlanId,
        JSON.stringify(metadataPayload),
        'pending',
        req.user?.id || null,
      ]
    );

    res.json({
      success: true,
      transactionRef,
      paymentType: normalizedType,
      amount: amountToCharge,
      paymentUrl: paymentInit.paymentUrl,
      scriptUrl: paymentInit.scriptUrl,
      inlineConfig: paymentInit.inlineConfig,
      // Legacy camelCase config for backward compatibility with existing hook/pages
      config: paymentInit.inlineConfig
        ? {
            merchantCode: paymentInit.inlineConfig.merchant_code,
            payItemId: paymentInit.inlineConfig.pay_item_id,
            payItemName: paymentInit.inlineConfig.pay_item_name,
            transactionReference: paymentInit.inlineConfig.txn_ref,
            amount: paymentInit.inlineConfig.amount,
            currency: Number(paymentInit.inlineConfig.currency),
            customerName: paymentInit.inlineConfig.cust_name,
            customerEmail: paymentInit.inlineConfig.cust_email,
            customerMobile: paymentInit.inlineConfig.cust_mobile_no,
            redirectUrl: paymentInit.inlineConfig.site_redirect_url,
            mode: paymentInit.inlineConfig.mode,
          }
        : null,
      context: {
        bookingId: bookingId || null,
        planId: resolvedPlanId,
      },
    });
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quickteller posts redirect notification as form-urlencoded; normalize it to frontend callback URL.
app.post('/api/payment/callback', express.urlencoded({ extended: false }), (req, res) => {
  const payload = req.body || {};
  const params = new URLSearchParams();

  const txnref = payload.txnref || payload.transactionreference || payload.transactionRef;
  if (txnref) params.set('txnref', String(txnref));
  if (payload.amount) params.set('amount', String(payload.amount));
  if (payload.resp) params.set('resp', String(payload.resp));
  if (payload.desc) params.set('desc', String(payload.desc));
  if (payload.retRef) params.set('retRef', String(payload.retRef));
  if (payload.payRef) params.set('payRef', String(payload.payRef));

  const url = `${getPublicBaseUrl()}/payment-callback${params.toString() ? `?${params.toString()}` : ''}`;
  return res.redirect(302, url);
});

// Support callback fallback when gateway redirects with query params.
app.get('/api/payment/callback', (req, res) => {
  const payload = req.query || {};
  const params = new URLSearchParams();

  const txnref = payload.txnref || payload.transactionreference || payload.transactionRef;
  if (txnref) params.set('txnref', String(txnref));
  if (payload.amount) params.set('amount', String(payload.amount));
  if (payload.resp) params.set('resp', String(payload.resp));
  if (payload.desc) params.set('desc', String(payload.desc));
  if (payload.retRef) params.set('retRef', String(payload.retRef));
  if (payload.payRef) params.set('payRef', String(payload.payRef));

  const url = `${getPublicBaseUrl()}/payment-callback${params.toString() ? `?${params.toString()}` : ''}`;
  return res.redirect(302, url);
});

// Verify payment
app.get('/api/payment/verify/:transactionRef', async (req, res) => {
  try {
    const { transactionRef } = req.params;
    const paymentTx = await pool.query(
      `SELECT transaction_ref, payment_type, amount, booking_id, plan_id, user_id, status
       FROM payment_transactions
       WHERE transaction_ref = $1
       LIMIT 1`,
      [transactionRef]
    );

    if (paymentTx.rows.length === 0) {
      return res.status(404).json({ success: false, status: 'failed', error: 'Transaction not found' });
    }

    const tx = paymentTx.rows[0];
    const amount = Number(tx.amount);
    const result = await verifyPayment(transactionRef, Number.isFinite(amount) ? amount : undefined);

    await pool.query(
      `UPDATE payment_transactions
       SET status = $1,
           verified_at = NOW(),
           payment_ref = $2,
           response_code = $3,
           verified_response = $4::jsonb,
           updated_at = NOW()
       WHERE transaction_ref = $5`,
      [
        result.status,
        result.paymentRef || null,
        result.responseCode || null,
        JSON.stringify(result.raw || {}),
        transactionRef,
      ]
    );

    const actions: Record<string, unknown> = {};

    if (result.status === 'successful') {
      if (tx.payment_type === 'salon_booking' && tx.booking_id) {
        await pool.query(
          `UPDATE salon_appointments
           SET payment_status = 'paid', payment_ref = $1, updated_at = NOW()
           WHERE id = $2`,
          [result.paymentRef || transactionRef, tx.booking_id]
        );
        actions.salonBookingUpdated = true;
      }

      if (tx.payment_type === 'analysis') {
        actions.analysisUnlocked = true;
      }

      if (tx.payment_type === 'subscription' && tx.plan_id && tx.user_id) {
        await pool.query(
          `UPDATE subscriptions
           SET status = 'cancelled', updated_at = NOW()
           WHERE user_id = $1 AND status = 'active'`,
          [tx.user_id]
        );

        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await pool.query(
          `INSERT INTO subscriptions (
            user_id, plan_id, status, current_period_start, current_period_end, scans_used_this_period
          )
           VALUES ($1, $2, 'active', $3, $4, 0)`,
          [tx.user_id, tx.plan_id, currentPeriodStart.toISOString(), currentPeriodEnd.toISOString()]
        );
        actions.subscriptionActivated = true;
      }
    }

    res.json({
      ...result,
      transactionRef,
      paymentType: tx.payment_type,
      actions,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, status: 'failed', error: error.message });
  }
});

// Get payment status
app.get('/api/payment/status/:transactionRef', async (req, res) => {
  try {
    const { transactionRef } = req.params;

    const result = await pool.query(
      `SELECT * FROM payment_transactions WHERE transaction_ref = $1`,
      [transactionRef]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions/consume-scan', authenticateToken, async (req: any, res) => {
  try {
    const subResult = await pool.query(
      `SELECT s.id, COALESCE(s.scans_used_this_period, 0) AS scans_used_this_period, sp.max_scans_per_month
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.user_id = $1 AND s.status = 'active' AND sp.is_active = true
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'No active subscription found' });
    }

    const sub = subResult.rows[0];
    const scansUsed = Number(sub.scans_used_this_period || 0);
    const maxScans = sub.max_scans_per_month === null ? null : Number(sub.max_scans_per_month);

    if (maxScans !== null && scansUsed >= maxScans) {
      return res.status(403).json({
        error: 'Scan limit reached',
        scansUsed,
        maxScans,
      });
    }

    await pool.query(
      `UPDATE subscriptions
       SET scans_used_this_period = COALESCE(scans_used_this_period, 0) + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [sub.id]
    );

    return res.json({
      success: true,
      scansUsed: scansUsed + 1,
      maxScans,
      scansRemaining: maxScans === null ? null : Math.max(0, maxScans - (scansUsed + 1)),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/storage/upload-scan', authenticateToken, async (req: any, res) => {
  try {
    const bucket = typeof req.body?.bucket === 'string' ? req.body.bucket.trim() : '';
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64.trim() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim() : 'image/jpeg';

    if (!['skin-scans', 'hair-scans'].includes(bucket)) {
      return res.status(400).json({ error: 'Invalid storage bucket' });
    }
    if (!fileName || !base64) {
      return res.status(400).json({ error: 'fileName and base64 are required' });
    }

    const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
    const ownerPrefix = fileName.split('/')[0];
    if (ownerPrefix && ownerPrefix !== req.user.id) {
      return res.status(403).json({ error: 'Invalid file path for current user' });
    }

    const bytes = Buffer.from(normalized, 'base64');
    const safeRelativePath = fileName.replace(/^\/+/, '').replace(/\.\./g, '');
    const targetPath = path.join(uploadsDir, bucket, safeRelativePath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, bytes);

    const publicUrl = `${getApiBaseUrl()}/uploads/${bucket}/${safeRelativePath}`.replace(/([^:]\/)\/+/g, '$1');
    return res.json({
      success: true,
      path: safeRelativePath,
      publicUrl,
      contentType,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
const frontendDistPath = path.join(__dirname, '..', 'skin-sense-buddy-main', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Initialize database and start server
async function initializeDatabase() {
  if (!databaseConfig.connectionString) {
    console.warn('Skipping database schema/seed initialization until database is configured.');
    return;
  }

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema created successfully');
    
    // Read and execute seed data
    const seedPath = path.join(__dirname, 'db', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seed);
    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlowSense API server running on port ${PORT}`);
  });
});

export default app;

// ==================== EMAIL ROUTES ====================

app.post('/api/checkout/send-details', authenticateToken, async (req: any, res) => {
  try {
    const nodemailer = require('nodemailer');
    const { fullName, email, phone, billingAddress, city, state, zipCode, specialInstructions, cartItems, cartTotal } = req.body;
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(500).json({
        error: 'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.'
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 587 : smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const itemsHTML = cartItems.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">×${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%); padding: 30px; color: white; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">New Order Details</h1>
              <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">IMSTEV NATURALS</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #7c3aed; margin-top: 0;">Customer Information</h2>
              <table style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 150px;">Full Name:</td>
                  <td style="padding: 8px;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Email:</td>
                  <td style="padding: 8px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Phone:</td>
                  <td style="padding: 8px;">${phone}</td>
                </tr>
              </table>

              <h2 style="color: #7c3aed;">Delivery Address</h2>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0;">${billingAddress}</p>
                <p style="margin: 0;">${city}, ${state} ${zipCode}</p>
              </div>

              <h2 style="color: #7c3aed;">Order Items</h2>
              <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7c3aed;">Product</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #7c3aed;">Qty</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #7c3aed;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>

              <div style="background: linear-gradient(135deg, #f5f5f5, #fff); padding: 15px; border-radius: 6px; border-left: 4px solid #7c3aed; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">Order Total: <span style="color: #7c3aed;">₦${cartTotal.toLocaleString()}</span></p>
              </div>

              ${specialInstructions ? `
                <h2 style="color: #7c3aed;">Special Instructions</h2>
                <p style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 0;">${specialInstructions}</p>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #999;">This is an automated message from IMSTEV NATURALS</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">40 Law School Road, Opp FirstBank, Bwari, Abuja | +234 903 350 5038</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: 'IMSTEV NATURALS <contact@imstevnaturals.com>',
      to: 'contact@imstevnaturals.com',
      subject: `New Order from ${fullName} - ₦${cartTotal.toLocaleString()}`,
      html: htmlContent
    });

    res.json({ success: true, message: 'Order details sent successfully' });
  } catch (error: any) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});
