-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'clinician', 'admin');

-- Create enum for subscription tiers
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'premium', 'family', 'professional');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier subscription_tier NOT NULL UNIQUE,
  price_ngn NUMERIC NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_scans_per_month INTEGER,
  max_family_members INTEGER,
  includes_telehealth BOOLEAN DEFAULT false,
  includes_custom_formulations BOOLEAN DEFAULT false,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  scans_used_this_period INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Family accounts table
CREATE TABLE public.family_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (parent_user_id, child_user_id)
);

ALTER TABLE public.family_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their family accounts"
ON public.family_accounts FOR SELECT
USING (auth.uid() = parent_user_id OR auth.uid() = child_user_id);

CREATE POLICY "Parents can manage family accounts"
ON public.family_accounts FOR ALL
USING (auth.uid() = parent_user_id);

-- Clinicians table
CREATE TABLE public.clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  license_number TEXT NOT NULL,
  years_experience INTEGER,
  bio TEXT,
  consultation_fee_ngn NUMERIC NOT NULL,
  availability JSONB DEFAULT '{}'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  rating NUMERIC(3,2),
  total_consultations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.clinicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians are viewable by everyone"
ON public.clinicians FOR SELECT
USING (is_verified = true);

CREATE POLICY "Clinicians can update own profile"
ON public.clinicians FOR UPDATE
USING (auth.uid() = user_id);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinician_id UUID REFERENCES public.clinicians(id) NOT NULL,
  scan_id UUID REFERENCES public.scans(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status appointment_status DEFAULT 'pending',
  meeting_url TEXT,
  notes TEXT,
  prescription TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = patient_user_id);

CREATE POLICY "Clinicians can view their appointments"
ON public.appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinicians
    WHERE clinicians.user_id = auth.uid()
    AND clinicians.id = appointments.clinician_id
  )
);

CREATE POLICY "Patients can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Clinicians can update their appointments"
ON public.appointments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clinicians
    WHERE clinicians.user_id = auth.uid()
    AND clinicians.id = appointments.clinician_id
  )
);

-- Custom formulations table
CREATE TABLE public.custom_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  diagnosis_id UUID REFERENCES public.diagnoses(id),
  formulation_name TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  instructions TEXT NOT NULL,
  expected_benefits JSONB,
  contraindications TEXT,
  estimated_cost_ngn NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.custom_formulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own formulations"
ON public.custom_formulations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own formulations"
ON public.custom_formulations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- API keys for clinic integration
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 1000,
  requests_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
ON public.api_keys FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clinicians_updated_at
  BEFORE UPDATE ON public.clinicians
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, tier, price_ngn, features, max_scans_per_month, max_family_members, includes_telehealth, includes_custom_formulations) VALUES
('Free Plan', 'free', 0, '["3 scans per month", "Basic analysis", "Product recommendations"]', 3, 1, false, false),
('Basic Plan', 'basic', 2500, '["10 scans per month", "Advanced analysis", "Priority support", "Progress tracking"]', 10, 1, false, false),
('Premium Plan', 'premium', 5000, '["Unlimited scans", "Custom formulations", "Telehealth access", "Advanced analytics"]', NULL, 1, true, true),
('Family Plan', 'family', 8000, '["Unlimited scans", "Up to 5 family members", "Custom formulations", "Telehealth access"]', NULL, 5, true, true),
('Professional Plan', 'professional', 15000, '["Unlimited scans", "Clinician dashboard", "API access", "Priority telehealth"]', NULL, 1, true, true);