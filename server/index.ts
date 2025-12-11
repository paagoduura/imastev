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
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
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
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
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
      `SELECT s.*, sp.name as plan_name, sp.features, sp.max_scans_per_month, 
              sp.includes_telehealth, sp.includes_custom_formulations, sp.max_family_members
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
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

app.post('/api/scans', authenticateToken, upload.single('image'), async (req: any, res) => {
  try {
    const { scan_type, calibration_data, porosity_test_result } = req.body;
    const imageUrl = req.file ? `/uploads/${scan_type || 'skin'}-scans/${req.file.filename}` : null;
    
    const result = await pool.query(
      `INSERT INTO scans (user_id, scan_type, image_url, calibration_data, porosity_test_result, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [req.user.id, scan_type || 'skin', imageUrl, calibration_data, porosity_test_result]
    );
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
    
    const appointmentId = uuidv4().slice(0, 8);
    const room = await createDailyRoom({
      name: `glowsense-${appointmentId}`,
      privacy: 'private',
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 2,
        exp: Math.floor(new Date(scheduled_at).getTime() / 1000) + (duration_minutes * 60) + 3600
      }
    });
    
    const result = await pool.query(
      `INSERT INTO appointments (patient_user_id, clinician_id, scheduled_at, duration_minutes, meeting_url, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [req.user.id, clinician_id, scheduled_at, duration_minutes, room.url]
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

// Salon services list
const SALON_SERVICES = [
  { id: 'twist-out', name: 'Twist Out Styling', category: 'Styling', duration: 90, price: 8000 },
  { id: 'flat-twist', name: 'Flat Twist Updo', category: 'Styling', duration: 120, price: 12000 },
  { id: 'cornrows', name: 'Cornrows', category: 'Braiding', duration: 180, price: 15000 },
  { id: 'loc-maintenance', name: 'Loc Maintenance', category: 'Locs', duration: 90, price: 10000 },
  { id: 'loc-styling', name: 'Loc Styling', category: 'Locs', duration: 60, price: 7000 },
  { id: 'deep-conditioning', name: 'Deep Conditioning Treatment', category: 'Treatment', duration: 60, price: 5000 },
  { id: 'protein-treatment', name: 'Protein Treatment', category: 'Treatment', duration: 75, price: 7500 },
  { id: 'scalp-treatment', name: 'Scalp Treatment & Massage', category: 'Treatment', duration: 45, price: 4500 },
  { id: 'kids-braiding', name: 'Kids Braiding', category: 'Kids', duration: 90, price: 6000 },
  { id: 'kids-twist', name: 'Kids Twist Styling', category: 'Kids', duration: 60, price: 4500 },
  { id: 'consultation', name: 'Hair Consultation', category: 'Consultation', duration: 30, price: 2500 },
  { id: 'custom-formulation', name: 'Custom Product Formulation', category: 'Premium', duration: 45, price: 8000 },
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
