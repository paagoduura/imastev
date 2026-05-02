Local dev & deploy for auth function

1) Install Supabase CLI: https://supabase.com/docs/guides/cli

2) Run local emulator (in repo root):

```bash
supabase start
```

3) Serve functions locally (if needed):

```bash
supabase functions serve
```

4) With the emulator running, Vite proxy will forward `/api/auth/*` to the local function endpoint at `http://localhost:54321/functions/v1/auth`.

5) Deploy to Supabase (once ready):

```bash
supabase functions deploy auth --project-ref <your-project-ref> --no-verify-jwt
```

6) Set required environment variables in Supabase project settings:
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `LOVABLE_API_KEY` (for analyze functions)

7) Notes:
- The function uses the Admin API to create users; do NOT expose the service role key to the frontend.
- After deploying, update your production API base to point to functions or migrate frontend to call Supabase directly.

Local test script
-----------------
I added a small Node test script at `scripts/test-auth-function.js` that will exercise the `/signup`, `/signin`, and `/user` endpoints on your local functions emulator.

Usage:

```bash
# Start the Supabase local emulator
supabase start

# In another shell, serve functions (if needed)
supabase functions serve

# Run the test (from skin-sense-buddy-main)
node scripts/test-auth-function.js

# Optional: override target and credentials
SUPABASE_FUNCTIONS_URL=http://localhost:54321/functions/v1 SUPABASE_TEST_EMAIL=you@example.com SUPABASE_TEST_PASSWORD=YourPass123 node scripts/test-auth-function.js
```

Notes:
- The `signup` action requires the `SUPABASE_SERVICE_ROLE_KEY` to be available in the functions environment (the emulator will read your local env). If you prefer not to create real users during testing, skip signup and use an existing user to test signin.
- The script expects Node 18+ (global `fetch`).
