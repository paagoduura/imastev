Supabase Auth Migration — Next Steps

1) Add frontend env vars
   - In `skin-sense-buddy-main`, create a `.env` (or `.env.local`) with:
     VITE_SUPABASE_URL=https://<your-project>.supabase.co
     VITE_SUPABASE_ANON_KEY=<anon-public-key>

2) Install client dependency
   - Run in `skin-sense-buddy-main`:
     npm install @supabase/supabase-js

3) Replace existing auth flows
   - Use `src/lib/supabase.ts` (created) to call `signIn`, `signUp`, `signOut`, and `getUser`.
   - Update the `Auth` page and `AdminLogin` to call `signIn` instead of the server `/api/auth/signin`.

4) Preserve existing users
   - If you want to migrate existing users in the database into Supabase Auth, create an Edge Function that uses the Supabase Admin API (service role key) to create users.
   - Use `SUPABASE_SERVICE_ROLE_KEY` server-side only; never expose it to the frontend.

5) Server-side adjustments
   - After frontend auth is active, convert protected endpoints to validate Supabase JWTs (check `supabase.auth.getUser()` or verify `Authorization: Bearer <token>` using Supabase JWT verification on the Edge Function).

6) Storage & uploads
   - Move local file uploads to Supabase Storage buckets and update endpoints to generate signed upload URLs or accept direct uploads from the client.

7) Testing
   - Run the app locally with the new `VITE_` vars and test sign up / sign in flows. Keep the Express server proxied until endpoints are ported.

If you'd like, I can now:
- Update `skin-sense-buddy-main/src/pages/Auth.tsx` and `AdminLogin.tsx` to use the new client (I can patch them), or
- Scaffold a Supabase Edge Function that proxies the old `/api/auth/*` contract to Supabase (safer incremental migration).
