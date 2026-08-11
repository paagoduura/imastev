-- Add hair profile columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hair_type TEXT,
ADD COLUMN IF NOT EXISTS hair_porosity TEXT,
ADD COLUMN IF NOT EXISTS hair_density TEXT,
ADD COLUMN IF NOT EXISTS hair_length TEXT,
ADD COLUMN IF NOT EXISTS is_chemically_treated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chemical_treatments TEXT[],
ADD COLUMN IF NOT EXISTS last_chemical_treatment DATE,
ADD COLUMN IF NOT EXISTS scalp_condition TEXT,
ADD COLUMN IF NOT EXISTS hair_concerns TEXT[];

-- Add scan_type to scans table
ALTER TABLE public.scans
ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT 'skin';

-- Add hair analysis fields to diagnoses table
ALTER TABLE public.diagnoses
ADD COLUMN IF NOT EXISTS analysis_type TEXT DEFAULT 'skin',
ADD COLUMN IF NOT EXISTS hair_profile JSONB;

-- Add product categorization for hair to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'skin',
ADD COLUMN IF NOT EXISTS suitable_hair_types TEXT[],
ADD COLUMN IF NOT EXISTS suitable_hair_concerns TEXT[];

-- Create hair-scans storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hair-scans', 'hair-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for hair-scans bucket
CREATE POLICY "Users can upload their own hair scans"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hair-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own hair scans"
ON storage.objects FOR SELECT
USING (bucket_id = 'hair-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own hair scans"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hair-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own hair scans"
ON storage.objects FOR DELETE
USING (bucket_id = 'hair-scans' AND auth.uid()::text = (storage.foldername(name))[1]);