-- Create storage bucket for skin scan images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'skin-scans',
  'skin-scans',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for skin-scans bucket
CREATE POLICY "Users can upload own scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'skin-scans' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'skin-scans' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'skin-scans' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );