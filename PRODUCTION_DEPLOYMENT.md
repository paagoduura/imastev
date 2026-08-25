# IMSTEV NATURALS Production Deployment Runbook

This application is a full-stack React/Vite and Express/PostgreSQL service. The production path uses the compiled frontend in `skin-sense-buddy-main/dist` and the compiled backend in `dist-server/index.js`. The preview fallbacks are intentionally disabled by the production startup validation.

## Production prerequisites

Provision a PostgreSQL database, a durable private filesystem or object-storage strategy for uploads, an SMTP provider, Quickteller/Interswitch live credentials, a Daily.co API key, and an OpenAI-compatible server-side API key. Configure a first-party HTTPS application URL and an API URL. Do not place any server secret in the Vite environment or frontend source.

Copy `.env.example` to the deployment secret store and set every required production value. The backend refuses to start when the database, session secret, public URLs, mail, payment, telehealth, or AI configuration is missing.

| Area | Required production configuration |
|---|---|
| Runtime | `NODE_ENV=production`, `SESSION_SECRET`, `PORT` |
| URLs | `PUBLIC_APP_URL` / `FRONTEND_URL`, `API_PUBLIC_URL` / `BACKEND_URL` |
| Database | `DATABASE_URL`, or the documented Supabase database variables |
| Mail | `SMTP_URL`, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` |
| Payments | `QUICKTELLER_ENV=live`, client ID, client secret, merchant code, and payment item ID |
| Telehealth | `DAILY_API_KEY` |
| Scan analysis | `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` |
| Storage | `UPLOADS_DIR` pointing to durable storage with restricted filesystem permissions |
| Admin access | An active `admin_credentials` row provisioned through the deployment secret manager or approved database administration process |

## Build and release

Run the following commands from the repository root in a clean deployment workspace:

```bash
npm ci
cd skin-sense-buddy-main && npm ci && cd ..
npm run check:server
npm run check:frontend
npm run build
npm audit --omit=dev --audit-level=high
cd skin-sense-buddy-main && npm audit --omit=dev --audit-level=high && cd ..
```

The build produces the browser assets in `skin-sense-buddy-main/dist`, the compiled backend at `dist-server/index.js`, and copies `server/db/schema.sql` and `server/db/seed.sql` into `dist-server/db` for startup initialization. Production startup skips sample seed data unless `RUN_DATABASE_SEED=true` is deliberately set for an approved initial load.

## Admin access provisioning

The admin portal uses a separate credential path from customer authentication. Do not commit an administrator password, seed a default credential, or rely on the development-only environment fallback in production. Provision the requested administrator through the deployment secret manager where the Express runtime is permitted to use `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or create an active `admin_credentials` row through an approved database administration process using a modern password hash. Verify `/api/admin/login`, `/api/admin/me`, and one protected admin endpoint after provisioning, then rotate the credential through the secret manager according to the organization’s access policy.

## Database and startup

The application initializes the idempotent schema at startup. Treat schema changes as controlled releases: back up the database first, test against a staging database, and apply any future migrations through the project’s migration process before promoting the application. Never use the development preview state as the source of customer data.

Use the compiled runtime rather than `tsx`:

```bash
NODE_ENV=production node dist-server/index.js
```

The included PM2 configuration runs the compiled artifact as one forked process. One process is intentional because local filesystem uploads and any remaining preview-only state are not safe to share across clustered workers. For horizontal scaling, move uploads to object storage, remove in-memory state from all production paths, and place session and job state in shared infrastructure first.

```bash
npm run build
pm2 start pm2.ecosystem.config.cjs --env production
pm2 save
```

## Reverse proxy and HTTPS

Use `nginx.conf.template` as the starting point for an HTTPS reverse proxy. Serve `skin-sense-buddy-main/dist` as the SPA root, proxy `/api/` and `/uploads/` to port 3001, set the real forwarded headers, and terminate TLS at the proxy. Confirm the production hostname is present in `PUBLIC_APP_URL` and `API_PUBLIC_URL`; CORS now performs exact-origin matching rather than prefix matching.

## Health and readiness

Use the readiness endpoint in the process manager and load balancer:

```bash
curl -fsS https://api.example.com/api/health
```

A healthy production response reports `status: "ok"` and `database: "ready"`. Missing production configuration or failed database initialization causes the process to exit instead of serving a misleading partial application.

## Security controls included in this release

The backend now requires a persistent session secret and production database, disables fallback admin credentials in production, avoids logging reset links, pins verification links to the configured first-party origin, exact-matches CORS origins, bounds JSON and multipart payloads, validates image MIME types, rejects unsafe upload paths, avoids raw exception details in production responses, disables mock Daily.co telehealth tokens in production, and prevents fabricated scan analysis when the AI provider is absent.

Uploaded community images remain public by design because they are displayed in the community feed. Scan media retains the existing URL-based history behavior but is marked `private, no-store` and `noindex`; a future privacy-hardening release should migrate scan media to signed object-storage URLs if scans must be inaccessible to anyone who obtains a URL.

## Backup and operational controls

Back up PostgreSQL before every schema or application release and verify restoration periodically in a separate environment. Back up or replicate `UPLOADS_DIR` if local filesystem storage is used. Rotate `SESSION_SECRET`, payment credentials, mail credentials, Daily credentials, and AI credentials through the deployment secret manager rather than editing files on the server. Monitor process restarts, database connection errors, Quickteller verification failures, mail delivery failures, Daily API failures, and scan-analysis failures.

## Current verification record

The production-readiness pass verified the following locally: backend TypeScript compilation, compiled backend generation, frontend TypeScript compilation, frontend lint with zero blocking errors, frontend production build, backend production build, root and frontend high-severity production dependency audits, compiled-server health, compiled-server sign-up, sign-in, protected-profile access, password-recovery initiation, and fail-closed production startup when required secrets are absent.

The sandbox cannot verify live PostgreSQL connectivity, SMTP delivery, Quickteller callbacks, Daily.co rooms, OpenAI analysis, DNS, TLS certificates, or durable object storage without the deployment environment’s real credentials and infrastructure. Those checks are mandatory release gates before exposing the application to customers.
