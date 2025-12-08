-- GlowSense AI Seed Data
-- Essential data for subscription plans, products, and sample clinicians

-- Subscription Plans
INSERT INTO subscription_plans (id, name, description, price_ngn, price_usd, interval, features, max_scans_per_month, includes_telehealth, includes_custom_formulations, max_family_members) VALUES
(uuid_generate_v4(), 'Free', 'Basic access to skin and hair analysis', 0, 0, 'month', 
 '["5 scans per month", "Basic analysis", "Product recommendations"]'::jsonb, 5, FALSE, FALSE, 1),
 
(uuid_generate_v4(), 'Premium', 'Enhanced access with unlimited scans and family features', 4999, 5.99, 'month',
 '["Unlimited scans", "Detailed analysis", "Progress tracking", "Priority support", "Up to 3 family members"]'::jsonb, 999, FALSE, FALSE, 3),
 
(uuid_generate_v4(), 'Professional', 'Complete access with telehealth and custom formulations', 14999, 17.99, 'month',
 '["Everything in Premium", "Telehealth consultations", "Custom formulations", "Up to 5 family members", "24/7 support"]'::jsonb, 999, TRUE, TRUE, 5)
ON CONFLICT DO NOTHING;

-- Skin Care Products
INSERT INTO products (sku, name, description, price_ngn, category, product_type, stock_quantity, ingredients, suitable_for_conditions, contraindications) VALUES
('SKN-001', 'African Black Soap Cleanser', 'Traditional Nigerian black soap enriched with shea butter for gentle cleansing. Perfect for oily and acne-prone skin.', 3500, 'Cleansers', 'skin', 100, 
 ARRAY['African Black Soap', 'Shea Butter', 'Coconut Oil', 'Palm Kernel Oil'], 
 ARRAY['acne', 'oily skin', 'hyperpigmentation'], 
 ARRAY['sensitive skin', 'eczema']),

('SKN-002', 'Turmeric Brightening Serum', 'Potent turmeric and vitamin C serum for hyperpigmentation and dark spots. Nigerian-formulated.', 8500, 'Serums', 'skin', 75,
 ARRAY['Turmeric Extract', 'Vitamin C', 'Niacinamide', 'Hyaluronic Acid'],
 ARRAY['hyperpigmentation', 'dark spots', 'uneven skin tone'],
 ARRAY['pregnancy']),

('SKN-003', 'Shea Butter Moisturizer', 'Rich moisturizer with pure Nigerian shea butter for dry and combination skin.', 4500, 'Moisturizers', 'skin', 120,
 ARRAY['Shea Butter', 'Cocoa Butter', 'Vitamin E', 'Aloe Vera'],
 ARRAY['dry skin', 'eczema', 'sensitive skin'],
 ARRAY[]::text[]),

('SKN-004', 'Aloe Vera Soothing Gel', 'Pure aloe vera gel for calming irritated and sunburned skin.', 2500, 'Treatments', 'skin', 150,
 ARRAY['Aloe Vera Gel', 'Cucumber Extract', 'Green Tea'],
 ARRAY['sunburn', 'irritation', 'sensitive skin'],
 ARRAY[]::text[]),

('SKN-005', 'Kojic Acid Dark Spot Corrector', 'Targeted treatment for stubborn dark spots and acne scars.', 7500, 'Treatments', 'skin', 60,
 ARRAY['Kojic Acid', 'Alpha Arbutin', 'Licorice Extract', 'Vitamin C'],
 ARRAY['dark spots', 'acne scars', 'hyperpigmentation'],
 ARRAY['pregnancy', 'sensitive skin']),

('SKN-006', 'Neem & Tea Tree Acne Treatment', 'Powerful anti-acne formula with neem and tea tree oil.', 5500, 'Treatments', 'skin', 80,
 ARRAY['Neem Extract', 'Tea Tree Oil', 'Salicylic Acid', 'Zinc'],
 ARRAY['acne', 'oily skin', 'blackheads'],
 ARRAY['dry skin', 'eczema'])
ON CONFLICT (sku) DO NOTHING;

-- Hair Care Products
INSERT INTO products (sku, name, description, price_ngn, category, product_type, stock_quantity, ingredients, suitable_for_conditions, suitable_hair_types, suitable_hair_concerns) VALUES
('HAIR-001', 'Deep Moisture Leave-In Conditioner', 'Intensive moisture treatment for 4A-4C hair types. Perfect for dry, coily hair.', 5500, 'Conditioners', 'hair', 90,
 ARRAY['Shea Butter', 'Coconut Oil', 'Argan Oil', 'Glycerin', 'Aloe Vera'],
 ARRAY['dry hair', 'breakage'],
 ARRAY['4A', '4B', '4C', 'natural'],
 ARRAY['dryness', 'breakage', 'frizz']),

('HAIR-002', 'Jamaican Black Castor Oil', 'Traditional JBCO for hair growth, edges, and scalp health.', 6500, 'Oils', 'hair', 100,
 ARRAY['Jamaican Black Castor Oil', 'Peppermint Oil', 'Rosemary Extract'],
 ARRAY['hair loss', 'thin edges', 'slow growth'],
 ARRAY['4A', '4B', '4C', 'relaxed', 'transitioning', 'natural'],
 ARRAY['thinning', 'slow growth', 'weak edges']),

('HAIR-003', 'Clarifying Shampoo', 'Sulfate-free clarifying shampoo to remove product buildup without stripping moisture.', 4000, 'Shampoos', 'hair', 85,
 ARRAY['Apple Cider Vinegar', 'Charcoal', 'Tea Tree Oil', 'Peppermint'],
 ARRAY['product buildup', 'oily scalp'],
 ARRAY['4A', '4B', '4C', 'relaxed', 'natural'],
 ARRAY['buildup', 'oily scalp', 'dandruff']),

('HAIR-004', 'Protein Treatment Mask', 'Strengthening protein mask for damaged and over-processed hair.', 7000, 'Treatments', 'hair', 70,
 ARRAY['Hydrolyzed Keratin', 'Silk Amino Acids', 'Biotin', 'Egg Protein'],
 ARRAY['damaged hair', 'breakage', 'chemical damage'],
 ARRAY['4A', '4B', '4C', 'relaxed', 'transitioning'],
 ARRAY['breakage', 'damage', 'weak hair']),

('HAIR-005', 'Edge Control Gel', 'Non-flaking edge control for sleek styles without buildup.', 2500, 'Styling', 'hair', 120,
 ARRAY['Castor Oil', 'Flaxseed Gel', 'Argan Oil', 'Biotin'],
 ARRAY['flyaways', 'edge styling'],
 ARRAY['4A', '4B', '4C', 'relaxed', 'natural'],
 ARRAY['edges', 'styling']),

('HAIR-006', 'Scalp Treatment Oil', 'Anti-dandruff and scalp-soothing treatment oil with neem and tea tree.', 5000, 'Treatments', 'hair', 65,
 ARRAY['Neem Oil', 'Tea Tree Oil', 'Jojoba Oil', 'Peppermint', 'Rosemary'],
 ARRAY['dandruff', 'dry scalp', 'itchy scalp'],
 ARRAY['4A', '4B', '4C', 'relaxed', 'natural', 'locs'],
 ARRAY['dandruff', 'itchy scalp', 'dry scalp']),

('HAIR-007', 'Curl Defining Cream', 'Lightweight cream for defined, bouncy curls and coils.', 4500, 'Styling', 'hair', 95,
 ARRAY['Shea Butter', 'Flaxseed Gel', 'Coconut Oil', 'Marshmallow Root'],
 ARRAY['undefined curls', 'frizz'],
 ARRAY['4A', '4B', '4C', 'natural'],
 ARRAY['frizz', 'curl definition']),

('HAIR-008', 'Transitioning Hair Treatment', 'Special treatment for hair transitioning from relaxed to natural.', 6000, 'Treatments', 'hair', 50,
 ARRAY['Olaplex-like Bond Repair', 'Keratin', 'Argan Oil', 'Avocado Oil'],
 ARRAY['transitioning hair', 'line of demarcation'],
 ARRAY['transitioning'],
 ARRAY['breakage', 'weak hair', 'transitioning'])
ON CONFLICT (sku) DO NOTHING;

-- Sample Clinicians (with user accounts)
-- Note: These will be linked to user accounts once users register as clinicians
INSERT INTO users (id, email, password_hash) VALUES
('11111111-1111-1111-1111-111111111111', 'dr.adaeze@glowsense.ng', '$2a$10$xVqYLIzDNZPKxKsm3lqQ4uxZLIHxHmL7VPrxXwXJz8TExbqWg4Niu'),
('22222222-2222-2222-2222-222222222222', 'dr.chidi@glowsense.ng', '$2a$10$xVqYLIzDNZPKxKsm3lqQ4uxZLIHxHmL7VPrxXwXJz8TExbqWg4Niu'),
('33333333-3333-3333-3333-333333333333', 'dr.ngozi@glowsense.ng', '$2a$10$xVqYLIzDNZPKxKsm3lqQ4uxZLIHxHmL7VPrxXwXJz8TExbqWg4Niu')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, age, sex) VALUES
('11111111-1111-1111-1111-111111111111', 'Dr. Adaeze Okwu', 38, 'female'),
('22222222-2222-2222-2222-222222222222', 'Dr. Chidi Okonkwo', 45, 'male'),
('33333333-3333-3333-3333-333333333333', 'Dr. Ngozi Eze', 42, 'female')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO clinicians (user_id, specialty, bio, license_number, consultation_fee_ngn, rating, total_consultations, years_experience, is_verified, availability) VALUES
('11111111-1111-1111-1111-111111111111', 'Dermatology', 
 'Board-certified dermatologist with expertise in African skin conditions, hyperpigmentation, and acne treatment. Graduate of University of Lagos Medical School with advanced training in cosmetic dermatology.',
 'MDCN/R/12345', 15000, 4.9, 234, 12, TRUE,
 '{"monday": ["09:00", "10:00", "11:00", "14:00", "15:00"], "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00"], "friday": ["09:00", "10:00", "11:00"]}'::jsonb),

('22222222-2222-2222-2222-222222222222', 'Trichology', 
 'Certified trichologist specializing in African hair care, natural hair health, and scalp conditions. Expert in 4A-4C hair types, relaxer damage recovery, and hair loss treatment.',
 'MDCN/R/23456', 12000, 4.8, 189, 15, TRUE,
 '{"tuesday": ["10:00", "11:00", "14:00", "15:00", "16:00"], "thursday": ["10:00", "11:00", "14:00", "15:00", "16:00"], "saturday": ["10:00", "11:00"]}'::jsonb),

('33333333-3333-3333-3333-333333333333', 'Dermatology & Trichology', 
 'Dual-certified specialist in both dermatology and trichology. Focuses on holistic skin and hair care for women of color. Known for personalized treatment plans.',
 'MDCN/R/34567', 18000, 4.95, 312, 18, TRUE,
 '{"monday": ["14:00", "15:00", "16:00"], "tuesday": ["09:00", "10:00", "11:00"], "wednesday": ["14:00", "15:00", "16:00"], "thursday": ["09:00", "10:00", "11:00"]}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role) VALUES
('11111111-1111-1111-1111-111111111111', 'clinician'),
('22222222-2222-2222-2222-222222222222', 'clinician'),
('33333333-3333-3333-3333-333333333333', 'clinician')
ON CONFLICT DO NOTHING;
