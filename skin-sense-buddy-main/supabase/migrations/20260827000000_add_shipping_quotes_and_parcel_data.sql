-- Secure, server-created shipping data for worldwide checkout.
-- Product parcel values must be populated by the IMSTEV admin before live quoting.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_weight_grams numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_length_cm numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_width_cm numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_height_cm numeric(12,2),
  ADD COLUMN IF NOT EXISTS customs_description text,
  ADD COLUMN IF NOT EXISTS hs_code text,
  ADD COLUMN IF NOT EXISTS country_of_origin text DEFAULT 'Nigeria';

CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  request_token text NOT NULL,
  courier_id text NOT NULL,
  service_code text NOT NULL,
  courier_name text NOT NULL,
  currency text NOT NULL,
  carrier_amount_ngn numeric(12,2) NOT NULL CHECK (carrier_amount_ngn > 0),
  markup_amount_ngn numeric(12,2) NOT NULL CHECK (markup_amount_ngn >= 0),
  customer_amount_ngn numeric(12,2) NOT NULL CHECK (customer_amount_ngn > 0),
  pickup_eta text,
  delivery_eta text,
  pickup_date date NOT NULL,
  origin_address_code bigint NOT NULL,
  destination_address_code bigint NOT NULL,
  destination jsonb NOT NULL,
  destination_signature text NOT NULL,
  parcel jsonb NOT NULL,
  cart_snapshot jsonb NOT NULL,
  cart_signature text NOT NULL,
  duties_mode text NOT NULL DEFAULT 'ddu',
  status text NOT NULL DEFAULT 'quoted',
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_quote_id uuid REFERENCES public.shipping_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_amount_ngn numeric(12,2),
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_delivery_eta text,
  ADD COLUMN IF NOT EXISTS shipping_duties_mode text;

ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shipping quotes" ON public.shipping_quotes;
CREATE POLICY "Users can view own shipping quotes"
  ON public.shipping_quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_shipping_quote_id_unique ON public.orders(shipping_quote_id) WHERE shipping_quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_user_id ON public.shipping_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_expires_at ON public.shipping_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_cart_signature ON public.shipping_quotes(cart_signature);

DROP TRIGGER IF EXISTS update_shipping_quotes_updated_at ON public.shipping_quotes;
CREATE TRIGGER update_shipping_quotes_updated_at
BEFORE UPDATE ON public.shipping_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
