Supabase Edge Functions Deployment

This repo includes a GitHub Actions workflow that installs the Supabase CLI on the runner and deploys all Edge Functions in `skin-sense-buddy-main/supabase/functions` when you push to `main`.

Required GitHub Secrets
- `SUPABASE_PROJECT_REF` — your Supabase project ref (found in Project Settings → API → Project ref).
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only). Add as secret; never expose in frontend.
- `SUPABASE_URL` — your Supabase URL (https://<project>.supabase.co)

How to deploy
1) Add the three secrets listed above to your GitHub repository settings → Secrets → Actions.
2) Push your branch to `main` (or merge a PR into `main`). This triggers the `.github/workflows/deploy-supabase-functions.yml` workflow and will deploy all functions under `skin-sense-buddy-main/supabase/functions`.
3) Monitor the workflow run in GitHub Actions to confirm successful deploy.

Notes & next steps
- The workflow uses the `supabase functions deploy` command and requires that functions are organized as Deno files in `skin-sense-buddy-main/supabase/functions/<functionName>/index.ts` (already present for `auth`, `analyze-skin`, etc.).
- After functions are deployed, configure the Vercel project with `VITE_SUPABASE_URL=https://<project-ref>.supabase.co` and, preferably, `VITE_USE_SUPABASE_FUNCTIONS=true` or `VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.supabase.co/functions/v1`. The production frontend now automatically uses the deployed `/functions/v1/api` endpoint when Supabase is configured instead of sending admin requests into Vercel's static `/api` rewrite.
- Database migrations, Storage policies, and RLS should be deployed separately; I can add workflows for those too.

Troubleshooting
- If the workflow fails at installing the CLI, check Actions runner logs (the workflow downloads the latest Linux release).
- If a function fails at runtime due to missing env vars, add them under Supabase Project Settings → Runtime Config. Admin access requires an active `admin_credentials` row or securely configured `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_AUTH_SECRET` function secrets; never commit those values.

If you want, I can now:
- Add a workflow to deploy DB migrations and storage policies.
- Update the frontend to call deployed function URLs directly.
- Trigger a deploy by creating a branch and pushing it to `main` for you (I can't push from here — you can push, or I can prepare a branch and instructions).

Local testing (no CLI) — quick start
----------------------------------
1) Ensure `.env` in the repo root contains your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (do NOT commit the service role key).
2) Install minimal deps (from `skin-sense-buddy-main`):

```bash
cd skin-sense-buddy-main
npm install express node-fetch dotenv
```

3) Run the local auth server:

```bash
node local_functions/auth-local-server.js
```

4) In another terminal run the test script:

```bash
node local_functions/test-local-auth.js
```

The local server implements `/auth/signup`, `/auth/signin`, `/auth/user`, and `/auth/refresh` and proxies them to Supabase REST endpoints using your `SUPABASE_SERVICE_ROLE_KEY` so you can test auth flows without the Supabase CLI or emulator.

Once you're happy with local testing, push to `main` to trigger the GitHub Actions deploy to publish the Edge Functions.
