# IMSTEV NATURALS shipping setup

The storefront now uses a server-side Shipbubble quote flow. The browser sends a validated delivery address to `POST /shipping/quote`; the Supabase Edge API loads the authenticated user’s cart and product parcel data, verifies the address, requests eligible pickup rates, selects the lowest verified NGN rate, adds exactly 2% with an upward naira rounding policy, and persists a short-lived quote. Quickteller order payment initialization recomputes the total from the current cart and quote, and order creation requires the payment transaction to be verified before persisting the order.

## Supabase Edge Function secrets

Add the following secrets to the production `api` Edge Function runtime. Never place these values in Vite environment variables, frontend code, Git, browser storage, or chat:

| Secret | Purpose |
|---|---|
| `SHIPBUBBLE_API_KEY` | Shipbubble test or production Bearer API key. Use the key prefix that matches the desired environment. |
| `SHIPBUBBLE_SENDER_ADDRESS_CODE` | Verified Shipbubble pickup address code for the Bwari/Abuja dispatch location. |
| `SHIPBUBBLE_CATEGORY_ID` | Shipbubble package category ID for IMSTEV NATURALS parcels. |

The migration must be applied before the Edge Function is deployed. The existing deployment workflow deploys Edge Functions but does not automatically apply database migrations, so apply `skin-sense-buddy-main/supabase/migrations/20260827000000_add_shipping_quotes_and_parcel_data.sql` through the project’s approved Supabase migration process.

## Product data required before checkout

Every active product in the cart must have a final sealed-package value for `shipping_weight_grams`, `shipping_length_cm`, `shipping_width_cm`, and `shipping_height_cm`. The admin catalogue editor now exposes these fields. Customs description, HS code, and country of origin should also be completed before international sales are enabled. If any parcel measurement is missing, the server deliberately refuses to create a quote rather than charging an invented or stale amount.

## Quote and customs policy

The customer-facing amount is calculated as `ceil(provider_total_ngn × 1.02)`. The 2% is the only customer markup introduced by this feature. Customs duties, destination taxes, brokerage, insurance, and other destination charges are not included; the quote is marked `DDU` until IMSTEV explicitly chooses and configures a duty-paid service.

## Test sequence

Use a Shipbubble sandbox key first. Populate one product with verified parcel data, configure the sender address and category IDs, then test Nigeria, Africa, Europe, North America, and a remote-address case. Confirm that the UI shows the selected carrier, service, delivery estimate, shipping amount, and DDU notice; that the Quickteller amount matches the server total; and that cart edits, address edits, expired quotes, and unverified payments are rejected safely.

Live deployment should occur only after the sandbox flow is successful, the migration is applied, production secrets are configured, product measurements are complete, and a real authorized account returns valid rates for the intended lanes.
