import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
import { initializePayment, verifyPayment, generateTransactionRef, validateQuicktellerConfig } from './quicktellerClient.ts';
import { resolveDatabaseConfig } from './dbConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const databaseConfig = resolveDatabaseConfig();
const PUBLIC_APP_ORIGIN = (
  process.env.PUBLIC_APP_URL?.trim() ||
  process.env.APP_BASE_URL?.trim() ||
  process.env.FRONTEND_URL?.trim() ||
  ''
).replace(/\/+$/, '');
const API_PUBLIC_ORIGIN = (
  process.env.API_PUBLIC_URL?.trim() ||
  process.env.BACKEND_URL?.trim() ||
  process.env.BACKEND_PUBLIC_URL?.trim() ||
  ''
).replace(/\/+$/, '');

// ── SESSION_SECRET check ──────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET?.trim();
let hasWarnedOptionalAuthSecret = false;
let _fallbackJwtSecret: string | null = null;
if (!SESSION_SECRET) {
  if (IS_PRODUCTION) {
    console.error('[FATAL] SESSION_SECRET environment variable is not set. Refusing to start in production mode.');
    process.exit(1);
  }
  console.warn('[SECURITY WARNING] SESSION_SECRET is not set. A random secret will be used, but all sessions will be invalidated on server restart. Set SESSION_SECRET in your .env file.');
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || '';

if (IS_PRODUCTION && (!ADMIN_EMAIL || !ADMIN_PASSWORD)) {
  console.warn('[CONFIG] Admin fallback login is disabled in production. Configure the admin_credentials table for admin access.');
}

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

function productionErrorMessage(error: unknown, fallback = 'Internal server error') {
  if (!IS_PRODUCTION && error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeConfiguredOrigin(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function validateProductionEnvironment() {
  if (!IS_PRODUCTION) return;

  const missing: string[] = [];
  if (!databaseConfig.connectionString) missing.push('DATABASE_URL or Supabase database settings');
  if (!SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!PUBLIC_APP_ORIGIN) missing.push('PUBLIC_APP_URL or FRONTEND_URL');
  if (!API_PUBLIC_ORIGIN) missing.push('API_PUBLIC_URL or BACKEND_URL');
  if (!getEmailTransportConfig()) missing.push('SMTP_URL or SMTP_HOST/SMTP_USER/SMTP_PASS');
  if (!process.env.DAILY_API_KEY?.trim()) missing.push('DAILY_API_KEY');
  if (!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())) {
    missing.push('OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY');
  }
  for (const name of ['QUICKTELLER_CLIENT_ID', 'QUICKTELLER_CLIENT_SECRET', 'QUICKTELLER_MERCHANT_CODE', 'QUICKTELLER_PAYMENT_ITEM_ID']) {
    if (!process.env[name]?.trim()) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(`Production configuration is incomplete: ${missing.join(', ')}`);
  }
}

function hashAdminPassword(password: string) {
  // SHA-256 kept only for legacy admin_credentials rows; new passwords use bcrypt
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function verifyAdminPassword(plaintext: string, storedHash: string): Promise<boolean> {
  // Support both legacy SHA-256 hashes and modern bcrypt hashes
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(plaintext, storedHash);
  }
  // Legacy SHA-256 comparison
  return hashAdminPassword(plaintext) === storedHash;
}

async function loadAdminCredential(email: string) {
  const result = await pool.query(
    `SELECT email, password_hash, is_active
     FROM admin_credentials
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
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

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
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
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;

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

function normalizeProductPayload(payload: any): Record<string, unknown> {
  const input = sanitizeProductPayload(payload);
  const normalized: Record<string, unknown> = {};
  const stringFields = ['sku', 'name', 'description', 'category', 'product_type', 'image_url'] as const;
  for (const field of stringFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      const value = input[field];
      normalized[field] = value === null || value === undefined ? null : String(value).trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, 'price_ngn')) normalized.price_ngn = Number(input.price_ngn);
  if (Object.prototype.hasOwnProperty.call(input, 'stock_quantity')) normalized.stock_quantity = Math.max(0, Math.floor(Number(input.stock_quantity)));
  if (Object.prototype.hasOwnProperty.call(input, 'is_active')) normalized.is_active = input.is_active !== false && input.is_active !== 'false';
  for (const field of ['ingredients', 'suitable_for_conditions', 'suitable_hair_types', 'suitable_hair_concerns', 'contraindications']) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      const value = input[field];
      normalized[field] = Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean)
        : String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  if ('name' in normalized && (!normalized.name || String(normalized.name).length > 255)) throw new Error('Product name is required and must be 255 characters or fewer');
  if ('price_ngn' in normalized && (!Number.isFinite(normalized.price_ngn as number) || (normalized.price_ngn as number) < 0)) throw new Error('Price must be a non-negative number');
  if ('stock_quantity' in normalized && !Number.isFinite(normalized.stock_quantity as number)) throw new Error('Stock quantity must be a number');
  if ('product_type' in normalized && !['hair', 'skin', 'both'].includes(String(normalized.product_type))) normalized.product_type = 'hair';
  return normalized;
}

function buildLocalProduct(payload: Record<string, unknown>, existing?: LocalProduct): LocalProduct {
  const now = new Date().toISOString();
  const id = existing?.id || uuidv4();
  return {
    id,
    sku: String(payload.sku ?? existing?.sku ?? `IM-${id.slice(0, 6).toUpperCase()}`),
    name: String(payload.name ?? existing?.name ?? 'Untitled product'),
    description: payload.description === null ? null : String(payload.description ?? existing?.description ?? ''),
    price_ngn: Number(payload.price_ngn ?? existing?.price_ngn ?? 0),
    category: payload.category === null ? null : String(payload.category ?? existing?.category ?? ''),
    product_type: String(payload.product_type ?? existing?.product_type ?? 'hair'),
    image_url: payload.image_url === null ? null : String(payload.image_url ?? existing?.image_url ?? ''),
    stock_quantity: Number(payload.stock_quantity ?? existing?.stock_quantity ?? 0),
    is_active: payload.is_active === undefined ? existing?.is_active !== false : Boolean(payload.is_active),
    ingredients: (payload.ingredients as string[] | undefined) || existing?.ingredients || [],
    suitable_for_conditions: (payload.suitable_for_conditions as string[] | undefined) || existing?.suitable_for_conditions || [],
    suitable_hair_types: (payload.suitable_hair_types as string[] | undefined) || existing?.suitable_hair_types || [],
    suitable_hair_concerns: (payload.suitable_hair_concerns as string[] | undefined) || existing?.suitable_hair_concerns || [],
    contraindications: (payload.contraindications as string[] | undefined) || existing?.contraindications || [],
    created_at: existing?.created_at || now,
    updated_at: now,
  };
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
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;

function hashVerificationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateEmailVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function resolveVerificationAppUrl(req: express.Request) {
  // In production, links must always use the configured first-party app origin.
  if (IS_PRODUCTION && PUBLIC_APP_ORIGIN) return PUBLIC_APP_ORIGIN;

  const origin = req.get('origin')?.trim();
  if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
    return origin.replace(/\/+$/, '');
  }

  return PUBLIC_APP_ORIGIN || getPublicBaseUrl();
}

function buildEmailVerificationLink(req: express.Request, token: string) {
  const baseUrl = resolveVerificationAppUrl(req);
  const params = new URLSearchParams({ verify_token: token });
  return `${baseUrl}/auth?${params.toString()}`;
}

function buildPasswordResetLink(req: express.Request, token: string) {
  const baseUrl = resolveVerificationAppUrl(req);
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
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

async function sendPasswordResetEmail(req: express.Request, email: string, token: string) {
  const resetUrl = buildPasswordResetLink(req, token);
  const mailConfig = getEmailTransportConfig();

  if (!mailConfig) {
    if (IS_PRODUCTION) throw new Error('Email delivery is not configured');
    console.warn(`Development password reset link generated for ${email}: ${resetUrl}`);
    return;
  }

  await mailConfig.transport.sendMail({
    from: mailConfig.from,
    to: email,
    subject: 'Reset your IMSTEV NATURALS password',
    text: `Reset your IMSTEV NATURALS password by opening this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Reset your IMSTEV NATURALS password</h2>
        <p>We received a request to create a new password for your account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a>
        </p>
        <p>This link expires in one hour and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendVerificationEmail(req: express.Request, email: string, token: string) {
  const verificationUrl = buildEmailVerificationLink(req, token);
  const mailConfig = getEmailTransportConfig();

  if (!mailConfig) {
    if (IS_PRODUCTION) throw new Error('Email delivery is not configured');
    console.warn(`Development email verification link generated for ${email}: ${verificationUrl}`);
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

type LocalAuthUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  email_verified_at: string;
  password_reset_token_hash?: string;
  password_reset_expires_at?: number;
};

type LocalPasswordReset = {
  userId: string;
  tokenHash: string;
  expiresAt: number;
};

// Preview/dev fallback: keeps the auth journey usable when no database is configured.
// Production still requires DATABASE_URL or Supabase database settings.
const localAuthUsers = new Map<string, LocalAuthUser>();
const localPasswordResets = new Map<string, LocalPasswordReset>();
const localAuthStatePath = process.env.LOCAL_AUTH_STATE_PATH?.trim() || '/tmp/imastev-preview-auth-state.json';

const loadLocalAuthState = () => {
  if (databaseConfig.connectionString) return;
  try {
    if (!fs.existsSync(localAuthStatePath)) return;
    const raw = JSON.parse(fs.readFileSync(localAuthStatePath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return;
    raw.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2) return;
      const [email, user] = entry as [unknown, unknown];
      if (typeof email !== 'string' || !user || typeof user !== 'object') return;
      const candidate = user as Partial<LocalAuthUser>;
      if (typeof candidate.id !== 'string' || typeof candidate.password_hash !== 'string' || typeof candidate.email !== 'string') return;
      localAuthUsers.set(email, candidate as LocalAuthUser);
    });
  } catch (error) {
    console.warn(`Unable to load preview auth state from ${localAuthStatePath}:`, error);
  }
};

const persistLocalAuthState = () => {
  if (databaseConfig.connectionString) return;
  try {
    fs.writeFileSync(localAuthStatePath, JSON.stringify(Array.from(localAuthUsers.entries()), null, 2), { mode: 0o600 });
  } catch (error) {
    console.warn(`Unable to persist preview auth state to ${localAuthStatePath}:`, error);
  }
};

loadLocalAuthState();
type LocalProfile = Record<string, unknown> & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};
const localProfiles = new Map<string, LocalProfile>();

type LocalProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price_ngn: number;
  category: string | null;
  product_type: string;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  ingredients: string[];
  suitable_for_conditions: string[];
  suitable_hair_types: string[];
  suitable_hair_concerns: string[];
  contraindications: string[];
  created_at: string;
  updated_at: string;
};

const localProducts = new Map<string, LocalProduct>();
const localProductsStatePath = process.env.LOCAL_PRODUCTS_STATE_PATH?.trim() || '/tmp/imastev-preview-products.json';

const loadLocalProductsState = () => {
  if (databaseConfig.connectionString) return;
  try {
    if (!fs.existsSync(localProductsStatePath)) return;
    const raw = JSON.parse(fs.readFileSync(localProductsStatePath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return;
    raw.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const product = entry as Partial<LocalProduct>;
      if (typeof product.id !== 'string' || typeof product.name !== 'string') return;
      localProducts.set(product.id, {
        id: product.id,
        sku: String(product.sku || `IM-${product.id.slice(0, 6).toUpperCase()}`),
        name: product.name,
        description: typeof product.description === 'string' ? product.description : null,
        price_ngn: Number(product.price_ngn || 0),
        category: typeof product.category === 'string' ? product.category : null,
        product_type: String(product.product_type || 'hair'),
        image_url: typeof product.image_url === 'string' ? product.image_url : null,
        stock_quantity: Number(product.stock_quantity || 0),
        is_active: product.is_active !== false,
        ingredients: Array.isArray(product.ingredients) ? product.ingredients.map(String) : [],
        suitable_for_conditions: Array.isArray(product.suitable_for_conditions) ? product.suitable_for_conditions.map(String) : [],
        suitable_hair_types: Array.isArray(product.suitable_hair_types) ? product.suitable_hair_types.map(String) : [],
        suitable_hair_concerns: Array.isArray(product.suitable_hair_concerns) ? product.suitable_hair_concerns.map(String) : [],
        contraindications: Array.isArray(product.contraindications) ? product.contraindications.map(String) : [],
        created_at: String(product.created_at || new Date().toISOString()),
        updated_at: String(product.updated_at || new Date().toISOString()),
      });
    });
  } catch (error) {
    console.warn(`Unable to load preview product state from ${localProductsStatePath}:`, error);
  }
};

const persistLocalProductsState = () => {
  if (databaseConfig.connectionString) return;
  try {
    fs.writeFileSync(localProductsStatePath, JSON.stringify(Array.from(localProducts.values()), null, 2), { mode: 0o600 });
  } catch (error) {
    console.warn(`Unable to persist preview product state to ${localProductsStatePath}:`, error);
  }
};

loadLocalProductsState();

if (databaseConfig.source === 'supabase_derived') {
  console.log('Database configured from Supabase settings.');
} else if (databaseConfig.source === 'missing') {
  console.warn(`Database config missing: ${databaseConfig.reason}`);
}

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 auth attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this IP. Please try again in 15 minutes.' },
  skip: (req) => !IS_PRODUCTION && req.ip === '127.0.0.1', // skip in dev for localhost
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 300,              // 300 requests/min per IP for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: () => !IS_PRODUCTION,
});

// ── Middleware stack ──────────────────────────────────────────────────────────
// Security headers (must be first)
app.use(helmet({
  crossOriginEmbedderPolicy: false,   // needed for Daily.co video embeds
  contentSecurityPolicy: false,       // managed separately if needed
}));

// Trust one reverse proxy in production; disable proxy trust for direct local development.
app.set('trust proxy', IS_PRODUCTION ? 1 : false);

// Gzip compression
app.use(compression());

// Request logging
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

// General API rate limit
app.use('/api', apiRateLimiter);

// Middleware - CORS first
const allowedOrigins = [
  PUBLIC_APP_ORIGIN,
  API_PUBLIC_ORIGIN,
  ...(process.env.REPLIT_DOMAINS?.split(',').map((domain) => `https://${domain.trim()}`) || []),
  ...(!IS_PRODUCTION ? ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3000'] : []),
].filter(Boolean).map(normalizeConfiguredOrigin);

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser requests such as health probes and server-to-server calls have no Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeConfiguredOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin is not allowed'));
  },
  credentials: true,
}));

// Keep JSON requests bounded. Scan images use the authenticated upload route below.
app.use(express.json({ limit: '16mb' }));

// Ensure uploads directory exists before registering static routes.
const uploadsDir = path.resolve(process.env.UPLOADS_DIR?.trim() || './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Community images are intentionally public for the Community feed.
app.use('/uploads/community', express.static(path.join(uploadsDir, 'community'), { maxAge: IS_PRODUCTION ? '1h' : 0 }));
// Product catalog images are public storefront assets, served separately from private scan uploads.
app.use('/uploads/catalog', express.static(path.join(uploadsDir, 'catalog'), {
  maxAge: IS_PRODUCTION ? '7d' : 0,
  setHeaders: (response) => response.setHeader('X-Robots-Tag', 'noindex'),
}));
// Scan URLs are retained for existing history views but are never cached or indexed.
const privateScanHeaders = (response: express.Response) => {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
};
app.use('/uploads/skin-scans', express.static(path.join(uploadsDir, 'skin-scans'), { setHeaders: privateScanHeaders }));
app.use('/uploads/hair-scans', express.static(path.join(uploadsDir, 'hair-scans'), { setHeaders: privateScanHeaders }));

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
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    cb(null, `${uuidv4()}${extensionByType[file.mimetype] || '.jpg'}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 24, fieldSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});
const catalogStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadsDir, 'catalog');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    cb(null, `${uuidv4()}${extensionByType[file.mimetype] || '.jpg'}`);
  },
});
const catalogUpload = multer({
  storage: catalogStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 8, fieldSize: 256 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

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

app.post('/api/auth/signup', authRateLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!databaseConfig.connectionString) {
      if (localAuthUsers.has(email)) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const now = new Date().toISOString();
      const user: LocalAuthUser = {
        id: uuidv4(),
        email,
        password_hash: await bcrypt.hash(password, 10),
        created_at: now,
        email_verified_at: now,
      };
      localAuthUsers.set(email, user);
      persistLocalAuthState();
      const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });
      return res.status(201).json({
        user: { id: user.id, email: user.email, created_at: user.created_at },
        token,
      });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password and create user — mark email as verified immediately (no email flow)
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified_at)
       VALUES ($1, $2, NOW())
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    await ensureUserScaffold(user.id);

    const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });

    res.status(201).json({
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/auth/signin', authRateLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (!databaseConfig.connectionString) {
      const localUser = localAuthUsers.get(email);
      if (!localUser || !(await bcrypt.compare(password, localUser.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: localUser.id, email: localUser.email }, getJwtSecret(), { expiresIn: '30m' });
      return res.json({
        user: { id: localUser.id, email: localUser.email, created_at: localUser.created_at },
        token,
      });
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
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = await syncLocalUserFromSupabaseAuth(email, password, existingUser);
      validPassword = true;
    }

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token with 30-minute expiry
    const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30m' });
    
    res.json({ 
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token 
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/auth/google', authRateLimiter, async (req, res) => {
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/auth/resend-verification', authRateLimiter, async (req, res) => {
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    };

    if (!databaseConfig.connectionString) {
      const user = localAuthUsers.get(email);
      if (!user) return res.json(genericResponse);

      const token = generateEmailVerificationToken();
      const tokenHash = hashVerificationToken(token);
      localPasswordResets.set(tokenHash, {
        userId: user.id,
        tokenHash,
        expiresAt: Date.now() + PASSWORD_RESET_WINDOW_MS,
      });
      await sendPasswordResetEmail(req, user.email, token);
      return res.json({
        ...genericResponse,
        ...(IS_PRODUCTION ? {} : { previewResetUrl: buildPasswordResetLink(req, token) }),
      });
    }

    const result = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = result.rows[0];
    if (!user) return res.json(genericResponse);

    const token = generateEmailVerificationToken();
    const tokenHash = hashVerificationToken(token);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, tokenHash]
    );
    await sendPasswordResetEmail(req, user.email, token);
    return res.json({
      ...genericResponse,
      ...(IS_PRODUCTION ? {} : { previewResetUrl: buildPasswordResetLink(req, token) }),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to start password reset. Please try again.' });
  }
});

app.post('/api/auth/reset-password', authRateLimiter, async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token || !password) return res.status(400).json({ error: 'Reset token and new password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const tokenHash = hashVerificationToken(token);
    const passwordHash = await bcrypt.hash(password, 10);

    if (!databaseConfig.connectionString) {
      const reset = localPasswordResets.get(tokenHash);
      if (!reset || reset.expiresAt <= Date.now()) {
        localPasswordResets.delete(tokenHash);
        return res.status(400).json({ error: 'This reset link is invalid or has expired' });
      }
      const user = Array.from(localAuthUsers.values()).find((candidate) => candidate.id === reset.userId);
      if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired' });
      user.password_hash = passwordHash;
      persistLocalAuthState();
      localPasswordResets.delete(tokenHash);
      return res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resetResult = await client.query(
        `SELECT user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );
      const reset = resetResult.rows[0];
      if (!reset) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This reset link is invalid or has expired' });
      }
      await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, reset.user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset your password. Please request a new link.' });
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
    console.error('Get user error:', error);
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// Token refresh endpoint - extends session on activity
app.post('/api/auth/refresh', authenticateToken, async (req: any, res) => {
  try {
    // Issue a new token with fresh 30-minute expiry
    const newToken = jwt.sign({ id: req.user.id, email: req.user.email }, getJwtSecret(), { expiresIn: '30m' });
    res.json({ token: newToken });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// ==================== ADMIN ROUTES ====================

app.post('/api/admin/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const adminCredential = await loadAdminCredential(email).catch(() => null);
    const passwordMatchesDatabase =
      adminCredential?.is_active &&
      typeof adminCredential.password_hash === 'string' &&
      await verifyAdminPassword(password, adminCredential.password_hash);

    const passwordMatchesFallback =
      !IS_PRODUCTION && Boolean(ADMIN_EMAIL && ADMIN_PASSWORD) &&
      email === getAdminEmail() && password === getAdminPassword();

    if (!passwordMatchesDatabase && !passwordMatchesFallback) {
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    if (!databaseConfig.connectionString) {
      const products = Array.from(localProducts.values());
      return res.json({
        stats: {
          totalUsers: localAuthUsers.size,
          totalProducts: products.length,
          totalOrders: 0,
          totalAppointments: 0,
          totalSalonBookings: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          lowStockProducts: products.filter((product) => product.is_active && product.stock_quantity <= 10).length,
        },
      });
    }
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const category = typeof req.query.category === 'string' ? req.query.category : 'all';
      const products = Array.from(localProducts.values())
        .filter((product) => !search || [product.name, product.sku, product.category || ''].some((value) => value.toLowerCase().includes(search)))
        .filter((product) => status === 'all' || (status === 'active' ? product.is_active : !product.is_active))
        .filter((product) => category === 'all' || product.category === category)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return res.json(products);
    }
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      values.push(`%${req.query.search.trim()}%`);
      clauses.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR category ILIKE $${values.length})`);
    }
    if (req.query.status === 'active' || req.query.status === 'inactive') {
      values.push(req.query.status === 'active');
      clauses.push(`is_active = $${values.length}`);
    }
    if (typeof req.query.category === 'string' && req.query.category !== 'all') {
      values.push(req.query.category);
      clauses.push(`category = $${values.length}`);
    }
    const result = await pool.query(
      `SELECT * FROM products ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY updated_at DESC NULLS LAST, created_at DESC, name ASC`,
      values,
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      const product = localProducts.get(req.params.id);
      return product ? res.json(product) : res.status(404).json({ error: 'Product not found' });
    }
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/admin/product-image', authenticateAdmin, (req: any, res: any, next: any) => {
  catalogUpload.single('image')(req, res, (error: any) => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP product image is required' });
    res.status(201).json({
      url: `/uploads/catalog/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
      mime_type: req.file.mimetype,
    });
  });
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      if (!localProducts.has(req.params.id)) return res.status(404).json({ error: 'Product not found' });
      localProducts.delete(req.params.id);
      persistLocalProductsState();
      return res.json({ success: true });
    }
    await pool.query('DELETE FROM order_items WHERE product_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/admin/products', authenticateAdmin, async (req: any, res: any) => {
  try {
    const payload = normalizeProductPayload(req.body);
    if (!payload.name || payload.price_ngn === undefined) return res.status(400).json({ error: 'Product name and price are required' });
    if (!databaseConfig.connectionString) {
      const product = buildLocalProduct(payload);
      localProducts.set(product.id, product);
      persistLocalProductsState();
      return res.status(201).json(product);
    }
    const keys = Object.keys(payload);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `INSERT INTO products (${keys.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, NOW(), NOW())
       RETURNING *`,
      keys.map((key) => payload[key]),
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: productionErrorMessage(error, 'Unable to create product') });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const payload = normalizeProductPayload(req.body);
    if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'No valid product fields were provided' });
    if (!databaseConfig.connectionString) {
      const existing = localProducts.get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found' });
      const product = buildLocalProduct(payload, existing);
      localProducts.set(product.id, product);
      persistLocalProductsState();
      return res.json(product);
    }
    const keys = Object.keys(payload);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...keys.map((key) => payload[key])];
    const result = await pool.query(
      `UPDATE products SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values,
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: productionErrorMessage(error, 'Unable to update product') });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// ==================== PROFILE ROUTES ====================

app.get('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    if (!databaseConfig.connectionString) {
      return res.json(localProfiles.get(req.user.id) || null);
    }

    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.put('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    const fields = sanitizeProfilePayload(req.body);
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid profile fields were provided' });
    }

    if (!databaseConfig.connectionString) {
      const now = new Date().toISOString();
      const current = localProfiles.get(req.user.id);
      const nextProfile: LocalProfile = {
        id: current?.id || uuidv4(),
        user_id: req.user.id,
        created_at: current?.created_at || now,
        updated_at: now,
        ...(current || {}),
        ...fields,
      };
      localProfiles.set(req.user.id, nextProfile);
      return res.json(nextProfile);
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// POST route for profiles - handles upsert (insert or update)
app.post('/api/profiles', authenticateToken, async (req: any, res) => {
  try {
    const profileData = sanitizeProfilePayload(req.body);

    if (!databaseConfig.connectionString) {
      const now = new Date().toISOString();
      const current = localProfiles.get(req.user.id);
      const nextProfile: LocalProfile = {
        id: current?.id || uuidv4(),
        user_id: req.user.id,
        created_at: current?.created_at || now,
        updated_at: now,
        ...(current || {}),
        ...profileData,
      };
      localProfiles.set(req.user.id, nextProfile);
      return res.json(nextProfile);
    }
    
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', async (req, res) => {
  try {
    const { type, category } = req.query;
    if (!databaseConfig.connectionString) {
      const products = Array.from(localProducts.values())
        .filter((product) => product.is_active)
        .filter((product) => !type || type === 'all' || product.product_type === type || product.product_type === 'both')
        .filter((product) => !category || category === 'all' || product.category === category)
        .sort((a, b) => a.name.localeCompare(b.name));
      return res.json(products);
    }
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      return res.json(localProducts.get(req.params.id) || null);
    }
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// ==================== SCAN ROUTES ====================

const EXPRESS_SUCCESSFUL_PAYMENT_STATUSES = ['paid', 'successful', 'completed'];

function redactExpressDiagnosis(diagnosis: any) {
  const firstCondition = Array.isArray(diagnosis?.conditions) ? diagnosis.conditions[0] : null;
  return {
    id: diagnosis?.id || null,
    scan_id: diagnosis?.scan_id || null,
    analysis_type: diagnosis?.analysis_type || null,
    primary_condition: diagnosis?.primary_condition || 'A care focus was identified.',
    confidence_score: null,
    severity: diagnosis?.severity || null,
    triage_level: diagnosis?.triage_level || null,
    conditions: firstCondition
      ? [{
          condition: firstCondition.condition || 'A care focus was identified.',
          confidence: null,
          severity: firstCondition.severity || null,
          explanation: null,
        }]
      : [],
  };
}

function redactExpressTreatmentPlan(treatmentPlan: any) {
  if (!treatmentPlan) return null;
  const recommendations = typeof treatmentPlan.recommendations === 'string'
    ? treatmentPlan.recommendations.trim()
    : 'Your care notes are ready to explore.';
  return {
    id: treatmentPlan.id || null,
    recommendations: recommendations.length > 180 ? `${recommendations.slice(0, 177).trimEnd()}…` : recommendations,
    follow_up_days: treatmentPlan.follow_up_days ?? null,
  };
}

async function getExpressScanAccess(userId: string, scanId: string) {
  const paymentResult = await pool.query(
    `SELECT payment_type, transaction_ref, status
     FROM payment_transactions
     WHERE user_id = $1
       AND payment_type IN ('analysis', 'subscription')
       AND LOWER(status) IN ('paid', 'successful', 'completed')
       AND (metadata->>'scanId' = $2 OR metadata->>'scan_id' = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, scanId]
  );
  const directPayment = paymentResult.rows[0] || null;

  const subscriptionResult = await pool.query(
    `SELECT sp.tier, s.current_period_end
     FROM subscriptions s
     JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.user_id = $1
       AND s.status = 'active'
       AND sp.is_active = true
     ORDER BY s.created_at DESC`,
    [userId]
  );
  const now = Date.now();
  const paidSubscription = subscriptionResult.rows.some((subscription: any) => {
    const tier = String(subscription.tier || 'free').toLowerCase();
    if (tier === 'free') return false;
    if (!subscription.current_period_end) return true;
    const periodEnd = new Date(subscription.current_period_end).getTime();
    return Number.isFinite(periodEnd) && periodEnd > now;
  });

  return {
    hasFullAccess: Boolean(directPayment || paidSubscription),
    paymentType: directPayment?.payment_type || (paidSubscription ? 'subscription' : null),
    transactionRef: directPayment?.transaction_ref || null,
  };
}

// Get subscription status for scan limits
app.get('/api/scan-quota', authenticateToken, async (req: any, res) => {
  try {
    const subResult = await pool.query(
      `SELECT s.*, sp.max_scans_per_month, sp.name as plan_name,
              COALESCE(sp.tier, lower(sp.name)) as tier
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active' AND sp.is_active = true
       LIMIT 1`,
      [req.user.id]
    );
    
    if (subResult.rows.length === 0) {
      // No active subscription - starter includes one scan preview.
      return res.json({
        hasSubscription: false,
        planName: 'Starter',
        tier: 'free',
        scansUsed: 0,
        maxScans: 1,
        scansRemaining: 1,
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/scans', authenticateToken, parseScanUpload, async (req: any, res) => {
  try {
    const scanType = normalizeScanType(req.body.scan_type);
    const imageUrl = req.file
      ? `/uploads/${scanType}-scans/${req.file.filename}`
      : (typeof req.body.image_url === 'string' && req.body.image_url.trim() ? req.body.image_url.trim() : null);
    const multiAngleUrls =
      req.body.multi_angle_urls && typeof req.body.multi_angle_urls === 'object'
        ? req.body.multi_angle_urls
        : req.body.capture_info && typeof req.body.capture_info === 'object' && req.body.capture_info.image_urls && typeof req.body.capture_info.image_urls === 'object'
          ? req.body.capture_info.image_urls
          : null;

    if (!databaseConfig.connectionString) {
      if (localScans.some((scan) => scan.user_id === req.user.id)) {
        return res.status(403).json({
          error: 'Scan limit reached',
          message: 'Your one-time scan has already been used. Unlock a complete analysis or choose a monthly plan for more scans.',
          scansUsed: 1,
          maxScans: 1,
        });
      }
      const localScan: LocalScan = {
        id: uuidv4(),
        user_id: req.user.id,
        scan_type: scanType,
        image_url: imageUrl,
        multi_angle_urls: multiAngleUrls,
        calibration_data: req.body.calibration_data || null,
        porosity_test_result: req.body.porosity_test_result || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      localScans.unshift(localScan);
      return res.json(localScan);
    }

    // Check subscription quota before creating scan
    const subResult = await pool.query(
      `SELECT s.*, sp.max_scans_per_month, sp.tier
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active' AND sp.is_active = true
       LIMIT 1`,
      [req.user.id]
    );
    
    let maxScans: number | null = 1; // Starter grants one scan preview.
    let scansUsed = 0;
    let subscriptionId = null;
    let tier = 'free';
    
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      tier = String(sub.tier || 'free').toLowerCase();
      maxScans = tier === 'free' ? 1 : sub.max_scans_per_month; // null means unlimited
      scansUsed = sub.scans_used_this_period || 0;
      subscriptionId = sub.id;
    }
    
    // Check if user has exceeded their scan limit (null = unlimited)
    if (maxScans !== null && scansUsed >= maxScans) {
      return res.status(403).json({ 
        error: 'Scan limit reached',
        message: tier === 'free'
          ? 'Your one-time scan has already been used. Unlock a complete analysis or choose a monthly plan for more scans.'
          : 'You have used all your scans for this period. Upgrade your plan for unlimited scans.',
        scansUsed,
        maxScans,
        tier
      });
    }
    
    const { calibration_data, porosity_test_result } = req.body;

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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/scans', authenticateToken, async (req: any, res) => {
  try {
    if (!databaseConfig.connectionString) {
      return res.json(localScans
        .filter((scan) => scan.user_id === req.user.id)
        .map((scan) => ({ ...scan, accessLevel: 'preview', paymentType: null, diagnoses: [], treatmentPlan: null })));
    }

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
    const scans = await Promise.all(result.rows.map(async (scan: any) => {
      const access = await getExpressScanAccess(req.user.id, scan.id);
      const diagnoses = Array.isArray(scan.diagnoses) ? scan.diagnoses : [];
      return {
        ...scan,
        accessLevel: access.hasFullAccess ? 'full' : 'preview',
        paymentType: access.paymentType,
        diagnoses: access.hasFullAccess ? diagnoses : diagnoses.slice(0, 1).map(redactExpressDiagnosis),
        treatmentPlan: null,
      };
    }));
    res.json(scans);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/scans/:id', authenticateToken, async (req: any, res) => {
  try {
    if (!databaseConfig.connectionString) {
      const localScan = localScans.find((scan) => scan.id === req.params.id && scan.user_id === req.user.id);
      return res.json(localScan
        ? { ...localScan, accessLevel: 'preview', paymentType: null, diagnoses: [], treatmentPlan: null }
        : null);
    }

    const result = await pool.query(
      `SELECT s.*, 
              json_agg(d.*) FILTER (WHERE d.id IS NOT NULL) as diagnoses
       FROM scans s
       LEFT JOIN diagnoses d ON s.id = d.scan_id
       WHERE s.id = $1 AND s.user_id = $2
       GROUP BY s.id`,
      [req.params.id, req.user.id]
    );
    const scan = result.rows[0];
    if (!scan) return res.json(null);

    const access = await getExpressScanAccess(req.user.id, req.params.id);
    const diagnoses = Array.isArray(scan.diagnoses) ? scan.diagnoses : [];
    const diagnosisId = diagnoses[0]?.id || null;
    const treatmentResult = diagnosisId
      ? await pool.query(
        'SELECT * FROM treatment_plans WHERE diagnosis_id = $1 ORDER BY created_at DESC LIMIT 1',
        [diagnosisId]
      )
      : { rows: [] };
    const treatmentPlan = treatmentResult.rows[0] || null;

    res.json({
      ...scan,
      accessLevel: access.hasFullAccess ? 'full' : 'preview',
      paymentType: access.paymentType,
      diagnoses: access.hasFullAccess ? diagnoses : diagnoses.slice(0, 1).map(redactExpressDiagnosis),
      treatmentPlan: access.hasFullAccess ? treatmentPlan : redactExpressTreatmentPlan(treatmentPlan),
    });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// ==================== AI ANALYSIS ROUTES ====================

app.post('/api/analyze/:type', authenticateToken, async (req: any, res) => {
  try {
    const { scanId } = req.body;
    const analysisType = req.params.type as 'skin' | 'hair';

    if (!databaseConfig.connectionString) {
      const localScan = localScans.find((scan) => scan.id === scanId && scan.user_id === req.user.id);
      if (!localScan) return res.status(404).json({ error: 'Scan not found' });
      localScan.status = 'analyzing';
      return res.status(202).json({
        success: false,
        status: 'processing',
        error: 'AI analysis requires a configured database in this preview. No diagnosis has been created.',
      });
    }
    
    await pool.query("UPDATE scans SET status = 'analyzing' WHERE id = $1", [scanId]);
    
    const scanResult = await pool.query('SELECT * FROM scans WHERE id = $1', [scanId]);
    const scan = scanResult.rows[0];
    
    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    const profile = profileResult.rows[0];
    
    const imagePaths: string[] = [];
    // Collect images from multi_angle_urls (JSON object of angle->url) or single image_url
    if (scan.multi_angle_urls && typeof scan.multi_angle_urls === 'object') {
      for (const url of Object.values(scan.multi_angle_urls)) {
        if (typeof url === 'string' && url.trim()) {
          // If it's a full URL (http/https), pass as-is; otherwise treat as a local relative path
          const path = /^https?:\/\//i.test(url) ? url : url.replace(/^\//, './');
          imagePaths.push(path);
        }
      }
    }
    if (scan.image_url && imagePaths.length === 0) {
      const singleUrl = scan.image_url;
      imagePaths.push(/^https?:\/\//i.test(singleUrl) ? singleUrl : singleUrl.replace(/^\//, './'));
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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

    if (!appointment.meeting_url) {
      return res.status(400).json({ error: 'No video meeting URL has been generated for this appointment. Please contact support.' });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

const WEEKDAY_OPENING_SLOT = '08:00';
const SUNDAY_OPENING_SLOT = '14:00';
const MONDAY_DAY_INDEX = 1;
const SUNDAY_DAY_INDEX = 0;

type LocalSalonBooking = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  user_id: string | null;
  service_type: string;
  service_name: string;
  appointment_date: string;
  time_slot: string;
  duration_minutes: number;
  price_ngn: number;
  notes: string | null;
  is_registered_user: boolean;
  status: string;
  payment_status: string;
  payment_ref: string | null;
  created_at: string;
};

const localSalonBookings: LocalSalonBooking[] = [];

type LocalScan = {
  id: string;
  user_id: string;
  scan_type: 'skin' | 'hair';
  image_url: string | null;
  multi_angle_urls: Record<string, string> | null;
  calibration_data: unknown;
  porosity_test_result: unknown;
  status: string;
  created_at: string;
};

const localScans: LocalScan[] = [];

type LocalPaymentTransaction = {
  transaction_ref: string;
  payment_type: string;
  amount: number;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  booking_id: string | null;
  plan_id: string | null;
  metadata: Record<string, unknown>;
  status: 'pending' | 'successful' | 'failed';
  user_id: string | null;
  created_at: string;
};

const localPaymentTransactions: LocalPaymentTransaction[] = [];

type LocalCommunityPost = {
  id: string;
  user_id: string;
  community_type: 'hair' | 'skin';
  author_name: string;
  author_role: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type LocalCommunityComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type LocalCommunityReaction = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  reaction: 'like' | 'love';
};

const localCommunityPosts: LocalCommunityPost[] = [
  {
    id: 'preview-hair-community-post',
    user_id: 'preview-community-editor',
    community_type: 'hair',
    author_name: 'IMSTEV Care Circle',
    author_role: 'Community guide',
    content: 'A gentle reminder for wash day: start with patience, keep your sections generous, and let moisture do the work. What is one small thing that makes your routine feel more like care?',
    image_url: '/imstev-community-braids.jpeg',
    created_at: new Date('2026-08-20T10:00:00.000Z').toISOString(),
  },
  {
    id: 'preview-skin-community-post',
    user_id: 'preview-community-editor',
    community_type: 'skin',
    author_name: 'IMSTEV Care Circle',
    author_role: 'Skin ritual guide',
    content: 'The best skin routine is the one your barrier can live with. Keep the edit simple, introduce one change at a time, and give your skin room to tell you what it needs.',
    image_url: '/imstev-skin.jpg',
    created_at: new Date('2026-08-19T09:30:00.000Z').toISOString(),
  },
];
const localCommunityComments: LocalCommunityComment[] = [];
const localCommunityReactions: LocalCommunityReaction[] = [];

const formatLocalCommunityPosts = (community: 'hair' | 'skin', currentUserId: string | null, limit: number) => {
  const posts = localCommunityPosts.filter((post) => post.community_type === community).slice(0, limit);
  return posts.map((post) => {
    const postReactions = localCommunityReactions.filter((reaction) => reaction.post_id === post.id);
    const comments = localCommunityComments.filter((comment) => comment.post_id === post.id);
    const formattedComments = comments.filter((comment) => !comment.parent_comment_id).map((comment) => {
      const commentReactions = localCommunityReactions.filter((reaction) => reaction.comment_id === comment.id);
      return {
        id: comment.id,
        author: comment.author_name,
        content: comment.content,
        createdAt: comment.created_at,
        likes: commentReactions.filter((reaction) => reaction.reaction === 'like').length,
        loves: commentReactions.filter((reaction) => reaction.reaction === 'love').length,
        userReaction: commentReactions.find((reaction) => reaction.user_id === currentUserId)?.reaction || null,
        replies: comments.filter((reply) => reply.parent_comment_id === comment.id).map((reply) => ({
          id: reply.id,
          author: reply.author_name,
          content: reply.content,
          createdAt: reply.created_at,
        })),
      };
    });

    return {
      id: post.id,
      community: post.community_type,
      author: post.author_name,
      authorRole: post.author_role,
      content: post.content,
      imageUrl: post.image_url,
      createdAt: post.created_at,
      likes: postReactions.filter((reaction) => reaction.reaction === 'like').length,
      loves: postReactions.filter((reaction) => reaction.reaction === 'love').length,
      userReaction: postReactions.find((reaction) => reaction.user_id === currentUserId)?.reaction || null,
      comments: formattedComments,
    };
  });
};

const getSalonSlotsForDate = (dateInput: string) => {
  const appointmentDate = new Date(`${dateInput}T00:00:00`);
  const dayOfWeek = appointmentDate.getDay();

  if (Number.isNaN(appointmentDate.getTime()) || dayOfWeek === MONDAY_DAY_INDEX) {
    return [] as string[];
  }

  const openingSlot = dayOfWeek === SUNDAY_DAY_INDEX ? SUNDAY_OPENING_SLOT : WEEKDAY_OPENING_SLOT;
  const openingSlotIndex = TIME_SLOTS.indexOf(openingSlot);
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

    // Get booked slots for this date. Preview mode uses the in-memory store
    // when no database connection has been configured.
    const bookedRows = databaseConfig.connectionString
      ? (await pool.query(
        `SELECT time_slot, duration_minutes FROM salon_appointments
         WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no-show')`,
        [date]
      )).rows
      : localSalonBookings
        .filter((booking) => booking.appointment_date === String(date) && !['cancelled', 'no-show'].includes(booking.status))
        .map(({ time_slot, duration_minutes }) => ({ time_slot, duration_minutes }));

    const bookedSlots = bookedRows.map(row => row.time_slot);

    // Calculate blocked time slots based on duration
    const blockedSlots = new Set<string>();
    bookedRows.forEach(booking => {
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// Get booked dates for calendar (show dates with limited/no availability)
app.get('/api/salon/booked-dates', async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNum = parseInt(String(month), 10);
    const yearNum = parseInt(String(year), 10);
    if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) and year are required' });
    }
    // First day of requested month
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    // Last day of requested month: day 0 of next month = last day of this month
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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
    res.status(500).json({ error: productionErrorMessage(error) });
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

app.get('/api/admin/community/posts', authenticateAdmin, async (_req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      return res.json(localCommunityPosts.map((post) => ({
        ...post,
        comment_count: localCommunityComments.filter((comment) => comment.post_id === post.id).length,
        reaction_count: localCommunityReactions.filter((reaction) => reaction.post_id === post.id).length,
      })));
    }
    const result = await pool.query(
      `SELECT p.id, p.community_type, p.author_name, p.author_role, p.content, p.image_url, p.created_at,
              COUNT(DISTINCT c.id)::int AS comment_count,
              COUNT(DISTINCT r.id)::int AS reaction_count
       FROM app_community_posts p
       LEFT JOIN app_community_comments c ON c.post_id = p.id
       LEFT JOIN app_community_reactions r ON r.post_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.delete('/api/admin/community/posts/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!databaseConfig.connectionString) {
      const index = localCommunityPosts.findIndex((post) => post.id === req.params.id);
      if (index < 0) return res.status(404).json({ error: 'Community post not found' });
      localCommunityPosts.splice(index, 1);
      for (let i = localCommunityComments.length - 1; i >= 0; i -= 1) if (localCommunityComments[i].post_id === req.params.id) localCommunityComments.splice(i, 1);
      for (let i = localCommunityReactions.length - 1; i >= 0; i -= 1) if (localCommunityReactions[i].post_id === req.params.id) localCommunityReactions.splice(i, 1);
      return res.json({ success: true });
    }
    const result = await pool.query('DELETE FROM app_community_posts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Community post not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.get('/api/community/posts', optionalAuth, async (req: any, res) => {
  try {
    const community = normalizeCommunityType(req.query?.community);
    const limitInput = Number(req.query?.limit || 50);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(1, limitInput), 100) : 50;
    const currentUserId = req.user?.id || null;

    if (!databaseConfig.connectionString) {
      return res.json({ posts: formatLocalCommunityPosts(community, currentUserId, limit) });
    }

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
    res.status(500).json({ error: productionErrorMessage(error) });
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

    if (!databaseConfig.connectionString) {
      const localPost: LocalCommunityPost = {
        id: uuidv4(),
        user_id: req.user.id,
        community_type: communityType,
        author_name: authorName,
        author_role: authorRole,
        content,
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
      };
      localCommunityPosts.unshift(localPost);
      return res.json({ success: true, id: localPost.id });
    }

    const insertResult = await pool.query(
      `INSERT INTO app_community_posts (user_id, community_type, author_name, author_role, content, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.user.id, communityType, authorName, authorRole, content, imageUrl || null]
    );

    res.json({ success: true, id: insertResult.rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
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
    return res.status(500).json({ error: productionErrorMessage(error, 'Failed to upload image') });
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

    if (databaseConfig.connectionString) {
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
    }

    const authorName = rawAuthorName || defaultCommunityAuthor(req.user?.email);
    if (!databaseConfig.connectionString) {
      const postExists = localCommunityPosts.some((post) => post.id === postId);
      if (!postExists) return res.status(404).json({ error: 'Post not found' });
      if (parentCommentId) {
        const parent = localCommunityComments.find((comment) => comment.id === parentCommentId && comment.post_id === postId);
        if (!parent || parent.parent_comment_id) return res.status(400).json({ error: 'Invalid parent comment' });
      }
      const localComment: LocalCommunityComment = {
        id: uuidv4(),
        post_id: postId,
        parent_comment_id: parentCommentId,
        user_id: req.user.id,
        author_name: authorName,
        content,
        created_at: new Date().toISOString(),
      };
      localCommunityComments.push(localComment);
      return res.json({ success: true, id: localComment.id });
    }

    const insertResult = await pool.query(
      `INSERT INTO app_community_comments (post_id, parent_comment_id, user_id, author_name, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [postId, parentCommentId, req.user.id, authorName, content]
    );

    res.json({ success: true, id: insertResult.rows[0]?.id });
  } catch (error: any) {
    res.status(500).json({ error: productionErrorMessage(error) });
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

    if (!databaseConfig.connectionString) {
      if (postId && !localCommunityPosts.some((post) => post.id === postId)) return res.status(404).json({ error: 'Post not found' });
      if (commentId && !localCommunityComments.some((comment) => comment.id === commentId)) return res.status(404).json({ error: 'Comment not found' });
      const existingReaction = localCommunityReactions.find((item) =>
        item.user_id === req.user.id &&
        (postId ? item.post_id === postId && item.comment_id === null : item.comment_id === commentId && item.post_id === null)
      );
      if (existingReaction) {
        if (existingReaction.reaction === reaction) {
          const index = localCommunityReactions.indexOf(existingReaction);
          localCommunityReactions.splice(index, 1);
          return res.json({ success: true, state: 'removed' });
        }
        existingReaction.reaction = reaction;
        return res.json({ success: true, state: 'updated' });
      }
      localCommunityReactions.push({
        id: uuidv4(),
        post_id: postId || null,
        comment_id: commentId || null,
        user_id: req.user.id,
        reaction,
      });
      return res.json({ success: true, state: 'added' });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
      notes,
      transactionRef,
    } = req.body || {};

    const normalizedCustomerName = typeof customerName === 'string' ? customerName.trim() : '';
    const normalizedCustomerEmail = typeof customerEmail === 'string' && customerEmail.trim()
      ? customerEmail.trim().toLowerCase()
      : null;
    const normalizedCustomerPhone = normalizePhoneNumber(customerPhone);
    const normalizedTransactionRef = typeof transactionRef === 'string' ? transactionRef.trim() : '';
    const normalizedAppointmentDate = typeof appointmentDate === 'string' ? appointmentDate.trim() : '';
    const normalizedTimeSlot = typeof timeSlot === 'string' ? timeSlot.trim() : '';

    const normalizedServiceIds = Array.from(new Set(Array.isArray(serviceIds)
      ? serviceIds
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
      : (typeof serviceId === 'string' && serviceId.trim() ? [serviceId.trim()] : [])));

    // Salon appointments are created only after the gateway has verified the deposit.
    if (!normalizedTransactionRef) {
      return res.status(400).json({ error: 'A verified payment reference is required to confirm this appointment.' });
    }

    if (!normalizedCustomerName || !normalizedCustomerPhone || !normalizedServiceIds.length || !normalizedAppointmentDate || !normalizedTimeSlot) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const selectedServices = normalizedServiceIds
      .map((id: string) => SALON_SERVICES.find((service) => service.id === id))
      .filter((service): service is typeof SALON_SERVICES[number] => Boolean(service));

    if (selectedServices.length !== normalizedServiceIds.length) {
      return res.status(400).json({ error: 'Invalid service' });
    }

    const totalDuration = selectedServices.reduce((sum, service) => sum + Number(service.duration || 0), 0);
    const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const depositAmount = Math.ceil(totalPrice / 2);
    const serviceName = selectedServices.map((service) => service.name).join(', ');
    const serviceType = Array.from(new Set(selectedServices.map((service) => service.category))).join(', ');
    const daySlots = getSalonSlotsForDate(normalizedAppointmentDate);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0 || depositAmount <= 0) {
      return res.status(400).json({ error: 'Selected services require a valid deposit.' });
    }

    const verifiedPayment = databaseConfig.connectionString
      ? (await pool.query(
        `SELECT transaction_ref, payment_type, status, amount, customer_phone, user_id
         FROM payment_transactions
         WHERE transaction_ref = $1
         LIMIT 1`,
        [normalizedTransactionRef]
      )).rows[0]
      : localPaymentTransactions.find((payment) => payment.transaction_ref === normalizedTransactionRef);

    if (!verifiedPayment) {
      return res.status(400).json({ error: 'Payment reference not found. Please restart checkout.' });
    }

    if (verifiedPayment.payment_type !== 'salon_booking' || verifiedPayment.status !== 'successful') {
      return res.status(402).json({ error: 'The salon deposit has not been verified.' });
    }

    if (Number(verifiedPayment.amount) !== depositAmount) {
      return res.status(400).json({ error: 'The verified deposit does not match this booking.' });
    }

    if (req.user?.id && verifiedPayment.user_id && String(verifiedPayment.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'This payment cannot be used for this account.' });
    }

    if (normalizePhoneNumber(verifiedPayment.customer_phone) !== normalizedCustomerPhone) {
      return res.status(400).json({ error: 'Booking contact details do not match the payment.' });
    }

    const existingBooking = databaseConfig.connectionString
      ? (await pool.query(
        'SELECT * FROM salon_appointments WHERE payment_ref = $1 LIMIT 1',
        [normalizedTransactionRef]
      )).rows[0]
      : localSalonBookings.find((booking) => booking.payment_ref === normalizedTransactionRef);

    if (existingBooking) {
      return res.json({ success: true, booking: existingBooking, message: 'Appointment already confirmed.' });
    }

    // Reject past dates
    const today = new Date();
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    if (normalizedAppointmentDate < todayStr) {
      return res.status(400).json({ error: 'Cannot book an appointment in the past.' });
    }

    if (!daySlots.length) {
      return res.status(400).json({ error: 'Salon appointments are not available on Mondays.' });
    }

    if (!daySlots.includes(normalizedTimeSlot)) {
      return res.status(400).json({ error: 'Selected time slot is outside salon opening hours.' });
    }

    // Check if slot is still available.
    const existingBookingCount = databaseConfig.connectionString
      ? (await pool.query(
        `SELECT id FROM salon_appointments
         WHERE appointment_date = $1 AND time_slot = $2
         AND status NOT IN ('cancelled', 'no-show')`,
        [normalizedAppointmentDate, normalizedTimeSlot]
      )).rows.length
      : localSalonBookings.filter((booking) => booking.appointment_date === normalizedAppointmentDate && booking.time_slot === normalizedTimeSlot && !['cancelled', 'no-show'].includes(booking.status)).length;

    if (existingBookingCount > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Create booking
    const isRegisteredUser = !!req.user;
    if (!databaseConfig.connectionString) {
      const booking: LocalSalonBooking = {
        id: uuidv4(),
        customer_name: normalizedCustomerName,
        customer_email: normalizedCustomerEmail,
        customer_phone: normalizedCustomerPhone,
        user_id: req.user?.id || verifiedPayment.user_id || null,
        service_type: serviceType,
        service_name: serviceName,
        appointment_date: normalizedAppointmentDate,
        time_slot: normalizedTimeSlot,
        duration_minutes: totalDuration,
        price_ngn: totalPrice,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        is_registered_user: isRegisteredUser,
        status: 'confirmed',
        payment_status: 'paid',
        payment_ref: normalizedTransactionRef,
        created_at: new Date().toISOString(),
      };
      localSalonBookings.push(booking);
      return res.json({ success: true, booking, message: 'Appointment booked successfully!' });
    }

    const result = await pool.query(
      `INSERT INTO salon_appointments
       (customer_name, customer_email, customer_phone, user_id, service_type, service_name,
        appointment_date, time_slot, duration_minutes, price_ngn, notes, is_registered_user, status,
        payment_status, payment_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        normalizedCustomerName, normalizedCustomerEmail, normalizedCustomerPhone,
        req.user?.id || verifiedPayment.user_id || null, serviceType, serviceName,
        normalizedAppointmentDate, normalizedTimeSlot, totalDuration, totalPrice,
        typeof notes === 'string' && notes.trim() ? notes.trim() : null, isRegisteredUser, 'confirmed',
        'paid', normalizedTransactionRef
      ]
    );

    res.json({
      success: true,
      booking: result.rows[0],
      message: 'Appointment booked successfully!'
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
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
     RETURNING id, name, tier, price_ngn, max_scans_per_month, is_active`,
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

// Check whether a scan has a successful analysis or subscription payment.
app.get('/api/analysis/payment-status', optionalAuth, async (req: any, res) => {
  const scanId = typeof req.query.scanId === 'string' ? req.query.scanId.trim() : '';
  if (!scanId) return res.status(400).json({ error: 'scanId is required' });

  if (!databaseConfig.connectionString) {
    const payment = localPaymentTransactions.find((item) =>
      ['analysis', 'subscription'].includes(item.payment_type)
      && (item.metadata.scanId === scanId || item.metadata.scan_id === scanId)
    );
    const paid = Boolean(payment && EXPRESS_SUCCESSFUL_PAYMENT_STATUSES.includes(String(payment.status).toLowerCase()));
    return res.json({
      paid,
      status: payment?.status || 'unpaid',
      paymentType: payment?.payment_type || null,
      transactionRef: payment?.transaction_ref || null,
      amount: payment?.amount || null,
      scanId,
    });
  }

  try {
    const result = await pool.query(
      `SELECT status, payment_type, transaction_ref, amount
       FROM payment_transactions
       WHERE payment_type IN ('analysis', 'subscription')
         AND (
           metadata->>'scanId' = $1
           OR metadata->>'scan_id' = $1
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [scanId]
    );
    const payment = result.rows[0];
    const paid = Boolean(payment && EXPRESS_SUCCESSFUL_PAYMENT_STATUSES.includes(String(payment.status).toLowerCase()));
    return res.json({
      paid,
      status: payment?.status || 'unpaid',
      paymentType: payment?.payment_type || null,
      transactionRef: payment?.transaction_ref || null,
      amount: payment?.amount || null,
      scanId,
    });
  } catch (error: any) {
    console.error('Analysis payment-status error:', error);
    return res.status(500).json({ error: 'Unable to check analysis payment status' });
  }
});

// Initialize payment - returns hosted and inline checkout configs
app.post('/api/payment/initialize', optionalAuth, async (req: any, res: any) => {
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
      if (!databaseConfig.connectionString) {
        resolvedPlanId = typeof planId === 'string' && planId.trim() ? planId.trim() : 'monthly-scan-plan';
        if (!resolvedDescription) resolvedDescription = 'Monthly scan plan';
      } else {
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
        if (!databaseConfig.connectionString) {
          const localScan = localScans.find((scan) => scan.id === resolvedScanId);
          if (!localScan || (req.user?.id && localScan.user_id !== req.user.id)) {
            return res.status(400).json({ error: 'Invalid scan for analysis payment' });
          }
        } else {
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

    // Store payment intent in the configured database, or keep a safe in-memory
    // intent for the development preview. Neither path marks payment as paid.
    if (!databaseConfig.connectionString) {
      localPaymentTransactions.unshift({
        transaction_ref: transactionRef,
        payment_type: normalizedType,
        amount: amountToCharge,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        booking_id: bookingId || null,
        plan_id: resolvedPlanId,
        metadata: metadataPayload,
        status: 'pending',
        user_id: req.user?.id || null,
        created_at: new Date().toISOString(),
      });
    } else {
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
    }

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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    if (!databaseConfig.connectionString) {
      const tx = localPaymentTransactions.find((payment) => payment.transaction_ref === transactionRef);
      if (!tx) {
        return res.status(404).json({ success: false, status: 'failed', error: 'Transaction not found' });
      }
      const result = await verifyPayment(transactionRef, tx.amount);
      tx.status = result.status;
      return res.json({
        ...result,
        transactionRef,
        paymentType: tx.payment_type,
        amount: result.amount ?? tx.amount,
        actions: {},
      });
    }

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
    if (!databaseConfig.connectionString) {
      const localPayment = localPaymentTransactions.find((payment) => payment.transaction_ref === transactionRef);
      if (!localPayment) return res.status(404).json({ error: 'Transaction not found' });
      return res.json(localPayment);
    }

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
    res.status(500).json({ error: productionErrorMessage(error) });
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
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

app.post('/api/storage/upload-scan', authenticateToken, async (req: any, res) => {
  try {
    const bucket = typeof req.body?.bucket === 'string' ? req.body.bucket.trim() : '';
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64.trim() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim().toLowerCase() : 'image/jpeg';

    if (!['skin-scans', 'hair-scans'].includes(bucket)) {
      return res.status(400).json({ error: 'Invalid storage bucket' });
    }
    if (!fileName || !base64) {
      return res.status(400).json({ error: 'fileName and base64 are required' });
    }

    const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
    const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedImageTypes.has(contentType)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are supported' });
    }

    const expectedPrefix = `${req.user.id}/`;
    if (!fileName.startsWith(expectedPrefix) || !/^[a-f0-9-]{20,}\/[A-Za-z0-9_.-]+$/i.test(fileName)) {
      return res.status(403).json({ error: 'Invalid file path for current user' });
    }

    const bytes = Buffer.from(normalized, 'base64');
    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image must be between 1 byte and 10 MB' });
    }
    const safeRelativePath = fileName.replace(/^\/+/, '');
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
    return res.status(500).json({ error: productionErrorMessage(error, 'Upload failed') });
  }
});

// Health and readiness check
app.get('/api/health', (_req, res) => {
  const ready = !IS_PRODUCTION || databaseReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'starting',
    database: databaseConfig.connectionString ? (databaseReady ? 'ready' : 'starting') : 'not_configured',
    environment: IS_PRODUCTION ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
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

// ==================== EMAIL ROUTES ====================

app.post('/api/checkout/send-details', authenticateToken, async (req: any, res) => {
  try {
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

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'cartItems must be a non-empty array' });
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
                <p style="margin: 0; font-size: 18px; font-weight: bold;">Order Total: <span style="color: #7c3aed;">₦${Number(cartTotal).toLocaleString()}</span></p>
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
      subject: `New Order from ${fullName} - ₦${Number(cartTotal).toLocaleString()}`,
      html: htmlContent
    });

    res.json({ success: true, message: 'Order details sent successfully' });
  } catch (error: any) {
    console.error('Checkout email error:', error);
    res.status(500).json({ error: productionErrorMessage(error) });
  }
});

// Initialize database and start server
let databaseReady = false;

async function initializeDatabase() {
  validateProductionEnvironment();

  if (!databaseConfig.connectionString) {
    console.warn('Skipping database schema/seed initialization until database is configured.');
    databaseReady = !IS_PRODUCTION;
    return;
  }

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema created successfully');
    
    // Seed only development or an explicitly approved production initialization.
    if (!IS_PRODUCTION || process.env.RUN_DATABASE_SEED === 'true') {
      const seedPath = path.join(__dirname, 'db', 'seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seed);
      console.log('Seed data inserted successfully');
    } else {
      console.log('Production seed skipped. Set RUN_DATABASE_SEED=true only for an intentional initial data load.');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    if (IS_PRODUCTION) throw error;
  }

  databaseReady = true;
}

// ── Global 404 handler ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must have 4 params for Express to treat it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = IS_PRODUCTION
    ? status >= 500 ? 'Internal server error' : err.message
    : err.message || 'Internal server error';
  if (status >= 500) {
    console.error('[ERROR]', err);
  }
  res.status(status).json({ error: message });
});

initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlowSense API server running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
    validateQuicktellerConfig();
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully…`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database pool closed.');
      } catch (err) {
        console.error('Error closing DB pool:', err);
      }
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});

export default app;
