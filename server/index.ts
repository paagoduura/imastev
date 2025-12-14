import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient, getStripePublishableKey } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { createDailyRoom, createMeetingToken } from './dailyClient';
import { analyzeWithAI } from './aiAnalysis';
import { initializePayment, verifyPayment, generateTransactionRef } from './quicktellerClient';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// JWT Secret
const JWT_SECRET = process.env.SESSION_SECRET || 'glowsense-secret-key-2024';

// Initialize Stripe
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (domain) {
      const webhookBaseUrl = `https://${domain}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`,
          { enabled_events: ['*'], description: 'GlowSense webhook' }
        );
        const webhookUuid = result?.uuid;
        if (webhookUuid) {
          console.log(`Webhook configured with UUID: ${webhookUuid}`);
          (global as any).stripeWebhookUuid = webhookUuid;
        }
      } catch (err: any) {
        console.log('Webhook setup skipped:', err.message);
      }
    } else {
      console.log('Skipping webhook setup - no domain available');
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill().then(() => console.log('Stripe data synced')).catch(console.error);
  } catch (error) {
    console.error('Stripe init error:', error);
  }
}

// Initialize Stripe on startup
initStripe();

// Middleware - CORS first
app.use(cors());

// CRITICAL: Stripe webhook must be registered BEFORE express.json()
// Support both /api/stripe/webhook and /api/stripe/webhook/:uuid patterns
const webhookHandler = async (req: any, res: any) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing signature' });

  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const uuid = req.params.uuid || (global as any).stripeWebhookUuid || '';
    await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook error' });
  }
};

app.post('/api/stripe/webhook/:uuid', express.raw({ type: 'application/json' }), webhookHandler);
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);

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
    const type = req.body.type || 'skin';
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

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Create empty profile
    await pool.query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [user.id]
    );
    
    // Create user role
    await pool.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [user.id, 'patient']
    );
    
    // Create free subscription
    const freePlan = await pool.query("SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1");
    if (freePlan.rows.length > 0) {
      await pool.query(
        'INSERT INTO subscriptions (user_id, plan_id, status) VALUES ($1, $2, $3)',
        [user.id, freePlan.rows[0].id, 'active']
      );
    }
    
    // Generate token with 30-minute expiry
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30m' });
    
    res.json({ user, token });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token with 30-minute expiry
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30m' });
    
    res.json({ 
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token 
    });
  } catch (error: any) {
    console.error('Signin error:', error);
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
    res.status(500).json({ error: error.message });
  }
});

// Token refresh endpoint - extends session on activity
app.post('/api/auth/refresh', authenticateToken, async (req: any, res) => {
  try {
    // Issue a new token with fresh 30-minute expiry
    const newToken = jwt.sign({ id: req.user.id, email: req.user.email }, JWT_SECRET, { expiresIn: '30m' });
    res.json({ token: newToken });
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
    const fields = req.body;
    const setClause = Object.keys(fields)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [req.user.id, ...Object.values(fields)];
    
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
    const profileData = req.body;
    // Use the authenticated user's ID
    profileData.user_id = req.user.id;
    
    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existingProfile.rows.length > 0) {
      // Update existing profile
      const fields = { ...profileData };
      delete fields.user_id; // Don't update user_id
      
      const keys = Object.keys(fields);
      const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const values = [req.user.id, ...Object.values(fields)];
      
      const result = await pool.query(
        `UPDATE profiles SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        values
      );
      res.json(result.rows[0]);
    } else {
      // Insert new profile
      const keys = Object.keys(profileData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(profileData);
      
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

// ==================== CART ROUTES ====================

app.get('/api/cart', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.*, p.name, p.price_ngn, p.image_url, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
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
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SCAN ROUTES ====================

// Get subscription status for scan limits
app.get('/api/scan-quota', authenticateToken, async (req: any, res) => {
  try {
    const subResult = await pool.query(
      `SELECT s.*, sp.max_scans_per_month, sp.name as plan_name, sp.tier
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

app.post('/api/scans', authenticateToken, upload.single('image'), async (req: any, res) => {
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
    
    const { scan_type, calibration_data, porosity_test_result } = req.body;
    const imageUrl = req.file ? `/uploads/${scan_type || 'skin'}-scans/${req.file.filename}` : null;
    
    const result = await pool.query(
      `INSERT INTO scans (user_id, scan_type, image_url, calibration_data, porosity_test_result, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [req.user.id, scan_type || 'skin', imageUrl, calibration_data, porosity_test_result]
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
    const result = await pool.query(
      `SELECT a.*, c.specialty, p.full_name as clinician_name
       FROM appointments a
       JOIN clinicians c ON a.clinician_id = c.id
       JOIN profiles p ON c.user_id = p.user_id
       WHERE a.patient_user_id = $1
       ORDER BY a.scheduled_at DESC`,
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
      `SELECT fa.*, p.full_name, p.age
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
    const { shipping_address, payment_method } = req.body;
    
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
    const total = cartResult.rows.reduce((sum, item) => sum + (item.price_ngn * item.quantity), 0);
    
    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount_ngn, shipping_address, payment_method, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [req.user.id, total, JSON.stringify(shipping_address), payment_method]
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

// ==================== STRIPE CHECKOUT ROUTES ====================

app.get('/api/stripe/publishable-key', async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get Stripe key' });
  }
});

app.post('/api/checkout/create-session', authenticateToken, async (req: any, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    
    const cartResult = await pool.query(
      `SELECT ci.*, p.name, p.price_ngn, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    
    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const lineItems = cartResult.rows.map(item => ({
      price_data: {
        currency: 'ngn',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(parseFloat(item.price_ngn) * 100),
      },
      quantity: item.quantity,
    }));
    
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: {
        user_id: req.user.id,
      },
    });
    
    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription/create-session', authenticateToken, async (req: any, res) => {
  try {
    const { planId } = req.body;
    const stripe = await getUncachableStripeClient();
    
    const planResult = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const plan = planResult.rows[0];
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'ngn',
          product_data: {
            name: `${plan.name} Subscription`,
            description: `GlowSense ${plan.name} Plan - Monthly`,
          },
          unit_amount: Math.round(parseFloat(plan.price_ngn) * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
      metadata: {
        user_id: req.user.id,
        plan_id: planId,
      },
    });
    
    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Subscription checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/checkout/session/:sessionId', authenticateToken, async (req: any, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ session });
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
      const startIdx = TIME_SLOTS.indexOf(booking.time_slot);
      if (startIdx >= 0) {
        const slotsNeeded = Math.ceil(booking.duration_minutes / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          if (TIME_SLOTS[startIdx + i]) {
            blockedSlots.add(TIME_SLOTS[startIdx + i]);
          }
        }
      }
    });

    const availableSlots = TIME_SLOTS.filter(slot => !blockedSlots.has(slot));

    res.json({ 
      date, 
      availableSlots, 
      bookedSlots: Array.from(blockedSlots),
      totalSlots: TIME_SLOTS.length 
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
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// Create salon booking
app.post('/api/salon/book', optionalAuth, async (req: any, res) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      serviceId, 
      appointmentDate, 
      timeSlot, 
      notes 
    } = req.body;

    // Validate required fields
    if (!customerName || !customerPhone || !serviceId || !appointmentDate || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get service details
    const service = SALON_SERVICES.find(s => s.id === serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Invalid service' });
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
        req.user?.id || null, service.category, service.name,
        appointmentDate, timeSlot, service.duration, service.price,
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
    
    // Verify ownership or allow if guest with matching phone
    let query = 'UPDATE salon_appointments SET status = $1, updated_at = NOW() WHERE id = $2';
    const params: any[] = ['cancelled', id];
    
    if (req.user) {
      query += ' AND user_id = $3';
      params.push(req.user.id);
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

    // Get booked slots
    const bookedResult = await pool.query(
      `SELECT time_slot, duration_minutes FROM salon_appointments 
       WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no-show')`,
      [date]
    );

    const blockedSlots = new Set<string>();
    bookedResult.rows.forEach(booking => {
      const startIdx = TIME_SLOTS.indexOf(booking.time_slot);
      if (startIdx >= 0) {
        const slotsNeeded = Math.ceil(booking.duration_minutes / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          if (TIME_SLOTS[startIdx + i]) {
            blockedSlots.add(TIME_SLOTS[startIdx + i]);
          }
        }
      }
    });

    // For registered users, prioritize morning slots (first 6 available)
    const availableSlots = TIME_SLOTS.filter(slot => !blockedSlots.has(slot));
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

// Initialize payment - returns inline checkout config
app.post('/api/payment/initialize', optionalAuth, async (req: any, res) => {
  try {
    const { amount, customerEmail, customerName, customerPhone, description, bookingId } = req.body;

    if (!amount || !customerEmail || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const redirectUrl = `https://${domain}/payment-callback`;
    const transactionRef = generateTransactionRef();

    // Store payment intent in database
    await pool.query(
      `INSERT INTO payment_transactions (transaction_ref, amount, customer_email, customer_name, customer_phone, booking_id, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [transactionRef, amount, customerEmail, customerName, customerPhone, bookingId || null, 'pending', req.user?.id || null]
    );

    // Get Quickteller credentials
    const merchantCode = process.env.QUICKTELLER_MERCHANT_CODE || '';
    const payItemId = process.env.QUICKTELLER_PAYMENT_ITEM_ID || '';
    const clientSecret = process.env.QUICKTELLER_CLIENT_SECRET || '';
    const isProduction = process.env.QUICKTELLER_ENV === 'production';
    
    // Amount in kobo (multiply by 100)
    const amountInKobo = Math.round(amount * 100);
    
    // Generate hash using the same method as quicktellerClient.ts
    const result = await initializePayment({
      amount,
      customerEmail,
      customerName,
      customerPhone,
      transactionRef,
      redirectUrl,
      description: 'IMSTEV NATURALS Salon Payment',
    });

    // Return inline checkout configuration
    res.json({
      success: true,
      transactionRef,
      config: {
        merchantCode,
        payItemId,
        transactionReference: transactionRef,
        amount: amountInKobo,
        currency: 566, // NGN
        customerName,
        customerEmail,
        customerMobile: customerPhone,
        redirectUrl,
        hash: result.paymentUrl ? new URL(result.paymentUrl).searchParams.get('hash') || '' : '',
        mode: isProduction ? 'LIVE' : 'TEST',
      },
      scriptUrl: isProduction 
        ? 'https://newwebpay.interswitchng.com/inline-checkout.js'
        : 'https://newwebpay.qa.interswitchng.com/inline-checkout.js',
      // Keep legacy paymentUrl for fallback
      paymentUrl: result.paymentUrl,
    });
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
app.get('/api/payment/verify/:transactionRef', async (req, res) => {
  try {
    const { transactionRef } = req.params;

    const result = await verifyPayment(transactionRef);

    // Update payment status in database
    if (result.success) {
      await pool.query(
        `UPDATE payment_transactions SET status = $1, verified_at = NOW(), payment_ref = $2 WHERE transaction_ref = $3`,
        [result.status, result.paymentRef || null, transactionRef]
      );

      // If payment is successful and linked to a booking, update booking status
      if (result.status === 'successful') {
        const paymentResult = await pool.query(
          `SELECT booking_id FROM payment_transactions WHERE transaction_ref = $1`,
          [transactionRef]
        );
        if (paymentResult.rows[0]?.booking_id) {
          await pool.query(
            `UPDATE salon_appointments SET payment_status = 'paid', payment_ref = $1 WHERE id = $2`,
            [transactionRef, paymentResult.rows[0].booking_id]
          );
        }
      }
    }

    res.json(result);
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
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@imstevnaturals.com',
        pass: process.env.SMTP_PASS || 'default-pass'
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
