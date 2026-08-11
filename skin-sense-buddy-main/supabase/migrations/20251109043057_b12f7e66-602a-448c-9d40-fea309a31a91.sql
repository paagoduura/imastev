-- Fix function search paths for security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
BEGIN
  new_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
  RETURN new_number;
END;
$$;