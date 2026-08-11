-- Store the admin login in the database so the admin panel uses a persistent credential record.
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_credentials_active_idx
ON public.admin_credentials (is_active)
WHERE is_active = true;

INSERT INTO public.admin_credentials (email, password_hash, is_active)
VALUES (
  'imastev@admin.com',
  '7676aaafb027c825bd9abab78b234070e702752f625b752e55e55b48e607e358',
  true
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = now();
