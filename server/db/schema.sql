-- GlowSense AI Database Schema
-- Complete PostgreSQL schema for all features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    email_verification_token_hash VARCHAR(255),
    email_verification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    age INTEGER,
    sex VARCHAR(20),
    phone VARCHAR(50),
    location VARCHAR(255),
    
    -- Skin profile
    skin_type VARCHAR(50),
    fitzpatrick_scale VARCHAR(10),
    skin_concerns TEXT[],
    
    -- Hair profile
    hair_type VARCHAR(20),
    hair_porosity VARCHAR(20),
    hair_density VARCHAR(20),
    hair_length VARCHAR(20),
    is_chemically_treated BOOLEAN DEFAULT FALSE,
    chemical_treatments TEXT[],
    scalp_condition VARCHAR(50),
    hair_concerns TEXT[],
    hair_goals TEXT[],
    
    -- Medical info
    is_pregnant BOOLEAN DEFAULT FALSE,
    medical_conditions TEXT[],
    current_medications TEXT[],
    allergies TEXT[],
    
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_ngn DECIMAL(10, 2) NOT NULL,
    price_usd DECIMAL(10, 2),
    interval VARCHAR(20) DEFAULT 'month',
    features JSONB,
    max_scans_per_month INTEGER DEFAULT 5,
    includes_telehealth BOOLEAN DEFAULT FALSE,
    includes_custom_formulations BOOLEAN DEFAULT FALSE,
    max_family_members INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    scans_used_this_period INTEGER DEFAULT 0,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scan_type VARCHAR(20) DEFAULT 'skin',
    image_url TEXT,
    thumbnail_url TEXT,
    multi_angle_urls JSONB,
    calibration_data JSONB,
    porosity_test_result JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_type VARCHAR(20) DEFAULT 'skin',
    conditions JSONB,
    primary_condition VARCHAR(255),
    confidence_score INTEGER,
    severity VARCHAR(20),
    triage_level VARCHAR(50),
    skin_profile JSONB,
    hair_profile JSONB,
    ai_model_version VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Treatment plans
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recommendations TEXT,
    ingredients_to_use TEXT[],
    ingredients_to_avoid TEXT[],
    lifestyle_tips TEXT[],
    product_recommendations JSONB,
    follow_up_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_ngn DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    product_type VARCHAR(20) DEFAULT 'skin',
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    ingredients TEXT[],
    suitable_for_conditions TEXT[],
    suitable_hair_types TEXT[],
    suitable_hair_concerns TEXT[],
    contraindications TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount_ngn DECIMAL(10, 2),
    shipping_address JSONB,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinicians
CREATE TABLE IF NOT EXISTS clinicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL,
    bio TEXT,
    license_number VARCHAR(100),
    consultation_fee_ngn DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    years_experience INTEGER,
    availability JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clinician_id UUID REFERENCES clinicians(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled',
    meeting_url TEXT,
    notes TEXT,
    prescription TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom formulations
CREATE TABLE IF NOT EXISTS custom_formulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    diagnosis_id UUID REFERENCES diagnoses(id),
    formulation_name VARCHAR(255) NOT NULL,
    ingredients JSONB NOT NULL,
    instructions TEXT NOT NULL,
    expected_benefits JSONB,
    contraindications TEXT,
    estimated_cost_ngn DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family accounts
CREATE TABLE IF NOT EXISTS family_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    child_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    relationship VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_user_id, child_user_id)
);

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'patient',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);

-- Salon appointments
CREATE TABLE IF NOT EXISTS salon_appointments (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    service_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price_ngn DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    is_registered_user BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'confirmed',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    payment_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions for Quickteller
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_ref VARCHAR(100) UNIQUE NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'general',
    amount DECIMAL(12, 2) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    booking_id INTEGER REFERENCES salon_appointments(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_ref VARCHAR(255),
    response_code VARCHAR(20),
    verified_response JSONB,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community posts (local backend tables tied to legacy users table)
CREATE TABLE IF NOT EXISTS app_community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_type VARCHAR(20) NOT NULL CHECK (community_type IN ('hair', 'skin')),
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(100) NOT NULL DEFAULT 'Community Member',
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community comments (supports replies with parent_comment_id)
CREATE TABLE IF NOT EXISTS app_community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES app_community_posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES app_community_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community reactions (like/love) on posts or comments
CREATE TABLE IF NOT EXISTS app_community_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES app_community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES app_community_comments(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL CHECK (reaction IN ('like', 'love')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_reaction_target_check CHECK (
      (post_id IS NOT NULL AND comment_id IS NULL)
      OR
      (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_post_unique
    ON app_community_reactions(user_id, post_id)
    WHERE post_id IS NOT NULL AND comment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_comment_unique
    ON app_community_reactions(user_id, comment_id)
    WHERE comment_id IS NOT NULL AND post_id IS NULL;

-- Add payment columns to salon_appointments if not exists
DO $$ BEGIN
    ALTER TABLE salon_appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
    ALTER TABLE salon_appointments ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(255);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing community columns when table already exists
DO $$ BEGIN
    ALTER TABLE app_community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing payment transaction columns when table already exists
DO $$ BEGIN
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'general';
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS response_code VARCHAR(20);
    ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS verified_response JSONB;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing subscription and scan columns when older tables already exist
DO $$ BEGIN
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scans_used_this_period INTEGER DEFAULT 0;
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS multi_angle_urls JSONB;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing email verification columns when older users table already exists
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_scan_id ON diagnoses(scan_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician ON appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON payment_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_plan_id ON payment_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_salon_appointments_date ON salon_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_salon_appointments_user_id ON salon_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type_created ON app_community_posts(community_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created ON app_community_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON app_community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON app_community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_comment ON app_community_reactions(comment_id);
