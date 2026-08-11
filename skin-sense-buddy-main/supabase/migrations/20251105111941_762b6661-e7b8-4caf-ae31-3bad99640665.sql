-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  skin_type TEXT CHECK (skin_type IN ('oily', 'dry', 'combination', 'normal', 'sensitive')),
  fitzpatrick_scale TEXT CHECK (fitzpatrick_scale IN ('I', 'II', 'III', 'IV', 'V', 'VI')),
  is_pregnant BOOLEAN DEFAULT false,
  allergies TEXT[],
  current_medications TEXT[],
  medical_conditions TEXT[],
  phone TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_metadata JSONB,
  capture_info JSONB,
  body_area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create diagnoses table
CREATE TABLE public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conditions JSONB NOT NULL,
  primary_condition TEXT NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  triage_level TEXT NOT NULL CHECK (triage_level IN ('self_care', 'see_gp', 'see_dermatologist', 'urgent_care')),
  skin_profile JSONB,
  heatmap_url TEXT,
  ai_model_version TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create treatment plans table
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations TEXT NOT NULL,
  ingredients_to_use TEXT[],
  ingredients_to_avoid TEXT[],
  lifestyle_tips TEXT[],
  product_recommendations JSONB,
  follow_up_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table (Imstev catalog)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  contraindications TEXT[],
  suitable_for_conditions TEXT[],
  suitable_skin_types TEXT[],
  price_ngn NUMERIC(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for scans
CREATE POLICY "Users can view own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for diagnoses
CREATE POLICY "Users can view own diagnoses"
  ON public.diagnoses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnoses"
  ON public.diagnoses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for treatment_plans
CREATE POLICY "Users can view own treatment plans"
  ON public.treatment_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own treatment plans"
  ON public.treatment_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for products (public read)
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample Imstev products
INSERT INTO public.products (sku, name, category, description, ingredients, contraindications, suitable_for_conditions, suitable_skin_types, price_ngn, is_active) VALUES
('IMSTV-TT-CLN', 'Tea Tree Cleanser', 'Cleanser', 'Gentle antibacterial cleanser for acne-prone skin', ARRAY['tea tree oil', 'aloe vera', 'glycerin'], ARRAY['tea tree allergy'], ARRAY['acne', 'oily skin'], ARRAY['oily', 'combination'], 4500, true),
('IMSTV-NIA-SER', 'Niacinamide Serum 10%', 'Serum', 'Reduces inflammation and controls oil production', ARRAY['niacinamide', 'zinc', 'hyaluronic acid'], ARRAY[]::text[], ARRAY['acne', 'hyperpigmentation', 'rosacea'], ARRAY['oily', 'combination', 'normal'], 6500, true),
('IMSTV-ALO-MST', 'Aloe Hydrating Gel', 'Moisturizer', 'Lightweight hydration without clogging pores', ARRAY['aloe vera', 'green tea extract', 'vitamin E'], ARRAY[]::text[], ARRAY['acne', 'dry skin', 'sensitive skin'], ARRAY['all'], 3500, true),
('IMSTV-RET-SER', 'Retinol Night Serum', 'Serum', 'Anti-aging and acne treatment with encapsulated retinol', ARRAY['retinol', 'rosehip oil', 'squalane'], ARRAY['pregnancy', 'breastfeeding'], ARRAY['acne', 'aging', 'hyperpigmentation'], ARRAY['normal', 'dry', 'combination'], 8500, true),
('IMSTV-VIT-SER', 'Vitamin C Brightening Serum', 'Serum', 'Fades dark spots and evens skin tone', ARRAY['vitamin c', 'ferulic acid', 'vitamin e'], ARRAY[]::text[], ARRAY['hyperpigmentation', 'dark spots', 'dull skin'], ARRAY['all'], 7500, true);