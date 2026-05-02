import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const PROFILE_FIELDS = [
  "full_name",
  "age",
  "sex",
  "phone",
  "location",
  "skin_type",
  "fitzpatrick_scale",
  "skin_concerns",
  "hair_type",
  "hair_porosity",
  "hair_density",
  "hair_length",
  "is_chemically_treated",
  "chemical_treatments",
  "scalp_condition",
  "hair_concerns",
  "hair_goals",
  "is_pregnant",
  "medical_conditions",
  "current_medications",
  "allergies",
  "onboarding_completed",
] as const;

const PRODUCT_FIELDS = [
  "sku",
  "name",
  "description",
  "price_ngn",
  "category",
  "product_type",
  "image_url",
  "stock_quantity",
  "is_active",
  "ingredients",
  "suitable_for_conditions",
  "suitable_hair_types",
  "suitable_hair_concerns",
  "contraindications",
] as const;

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
] as const;

const SALON_SERVICES = [
  { id: "loosening-hair", name: "Loosening of Hair", category: "Hairdo", duration: 60, price: 1000, priceMax: 8000 },
  { id: "blow-drying", name: "Blow Drying", category: "Hairdo", duration: 30, price: 1500 },
  { id: "retouching", name: "Retouching", category: "Hairdo", duration: 60, price: 3000 },
  { id: "dyeing-client-colour", name: "Dyeing/Colouring (Client Colour)", category: "Colouring", duration: 90, price: 1500 },
  { id: "dyeing-salon-colour", name: "Dyeing/Colouring (Salon Product)", category: "Colouring", duration: 90, price: 3000 },
  { id: "natural-twist-jumbo", name: "Natural Twist - Jumbo Size", category: "Twists", duration: 90, price: 2000 },
  { id: "natural-twist-medium", name: "Natural Twist - Medium Size", category: "Twists", duration: 120, price: 3000 },
  { id: "natural-twist-small", name: "Natural Twist - Small Size", category: "Twists", duration: 180, price: 5000 },
  { id: "kinky-twist-jumbo", name: "Kinky Twist - Jumbo Size", category: "Twists", duration: 120, price: 3500 },
  { id: "kinky-twist-medium", name: "Kinky Twist - Medium Size", category: "Twists", duration: 180, price: 4500 },
  { id: "kinky-twist-small", name: "Kinky Twist - Small Size", category: "Twists", duration: 300, price: 12000 },
  { id: "braids-jumbo", name: "Braids - Jumbo Size", category: "Braiding", duration: 120, price: 3000 },
  { id: "braids-medium", name: "Braids - Medium Size", category: "Braiding", duration: 180, price: 4500 },
  { id: "braids-small", name: "Braids - Small Size", category: "Braiding", duration: 240, price: 6000 },
  { id: "cornrows-didi", name: "Cornrows / Didi", category: "Braiding", duration: 90, price: 1000, priceMax: 3000 },
  { id: "threading", name: "Threading", category: "Braiding", duration: 120, price: 4000, priceMax: 6000 },
  { id: "crochet", name: "Crochet", category: "Braiding", duration: 120, price: 4000, priceMax: 6000 },
  { id: "relocking-dread", name: "Relocking of Dreadlocks", category: "Locs", duration: 90, price: 5000 },
  { id: "relocking-micro-sister", name: "Relocking of Microlocs & Sisterlocs", category: "Locs", duration: 120, price: 8000 },
  { id: "install-dreadlocks", name: "Installation of Dreadlocks", category: "Locs", duration: 300, price: 15000, priceMax: 20000 },
  { id: "install-microlocs", name: "Installation of Microlocs", category: "Locs", duration: 420, price: 25000, priceMax: 35000 },
  { id: "install-sisterlocs", name: "Installation of Sisterlocs", category: "Locs", duration: 480, price: 35000, priceMax: 40000 },
  { id: "bridal-packing", name: "Bridal Packing", category: "Premium", duration: 180, price: 1500, priceMax: 25000 },
  { id: "wash-client-products", name: "Washing (Client Products)", category: "Treatment", duration: 30, price: 1200 },
  { id: "wash-treatment-short", name: "Washing & Treatment - Short Hair", category: "Treatment", duration: 45, price: 4200 },
  { id: "wash-treatment-long", name: "Washing & Treatment - Long Hair", category: "Treatment", duration: 60, price: 5200 },
  { id: "deep-conditioning-short", name: "Deep Conditioning - Short Hair", category: "Treatment", duration: 45, price: 1000 },
  { id: "deep-conditioning-long", name: "Deep Conditioning - Long Hair", category: "Treatment", duration: 60, price: 1500 },
  { id: "leave-in-short", name: "Leave-in Treatment - Short Hair", category: "Treatment", duration: 30, price: 1000 },
  { id: "leave-in-long", name: "Leave-in Treatment - Long Hair", category: "Treatment", duration: 45, price: 1500 },
  { id: "protein-treatment", name: "Protein Treatment", category: "Treatment", duration: 60, price: 1000 },
  { id: "clay-mask", name: "Clay Mask Treatment", category: "Treatment", duration: 45, price: 1000 },
  { id: "butter-treatment-long", name: "Butter Treatment - Long Hair", category: "Treatment", duration: 30, price: 1000 },
  { id: "butter-treatment-short", name: "Butter Treatment - Short Hair", category: "Treatment", duration: 30, price: 500 },
  { id: "hair-growth-solution", name: "Hair Growth Solution", category: "Treatment", duration: 30, price: 500 },
  { id: "aloe-vera-treatment", name: "Aloe Vera Treatment", category: "Treatment", duration: 30, price: 500 },
  { id: "flaxseed-treatment", name: "Flaxseed Treatment", category: "Treatment", duration: 30, price: 500 },
  { id: "rice-water-treatment", name: "Rice Water Treatment", category: "Treatment", duration: 30, price: 500 },
  { id: "acv-treatment", name: "ACV Treatment", category: "Treatment", duration: 20, price: 500 },
  { id: "fenugreek-treatment", name: "Fenugreek Treatment", category: "Treatment", duration: 30, price: 500 },
  { id: "serum-oil", name: "Serum / Oil Application", category: "Treatment", duration: 15, price: 500 },
  { id: "mousse-application", name: "Mousse Application", category: "Treatment", duration: 15, price: 500 },
  { id: "shampoo", name: "Shampoo", category: "Treatment", duration: 15, price: 500 },
  { id: "soda-treatment", name: "Soda Treatment", category: "Treatment", duration: 20, price: 500 },
  { id: "scalp-massage", name: "Scalp Massage (Bonus)", category: "Bonus", duration: 15, price: 0 },
  { id: "trimming", name: "Trimming (Bonus)", category: "Bonus", duration: 15, price: 0 },
  { id: "heat-cap", name: "Heat Cap (Bonus)", category: "Bonus", duration: 20, price: 0 },
  { id: "consultation", name: "Hair Consultation", category: "Consultation", duration: 30, price: 12000 },
];

const SALON_DEPOSIT_NGN = 1000;
const COMMUNITY_TYPES = ["hair", "skin"] as const;
const COMMUNITY_REACTIONS = ["like", "love"] as const;

type UserContext = {
  id: string;
  email: string;
};

type AdminContext = {
  email: string;
  role: "admin";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(url: string, status = 302) {
  return new Response(null, {
    status,
    headers: { ...corsHeaders, Location: url },
  });
}

function getEnv(name: string, fallback = "") {
  return Deno.env.get(name)?.trim() || fallback;
}

function createServiceClient() {
  return createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function createAnonClient() {
  const key = getEnv("SUPABASE_ANON_KEY") || getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(getEnv("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function googleClientId() {
  return getEnv("GOOGLE_CLIENT_ID") || getEnv("VITE_GOOGLE_CLIENT_ID");
}

function normalizePath(pathname: string) {
  const match = pathname.match(/\/api(\/.*)?$/);
  return match?.[1] || "/";
}

function getSegments(pathname: string) {
  return normalizePath(pathname).split("/").filter(Boolean);
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function normalizePhoneNumber(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function sanitizePayload<T extends readonly string[]>(payload: unknown, allowed: T) {
  const sanitized: Record<string, unknown> = {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return sanitized;
  }

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = (payload as Record<string, unknown>)[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "country")) {
    sanitized.location = (payload as Record<string, unknown>).country;
  }

  return sanitized;
}

async function parseJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function decodeBase64Payload(input: string) {
  const normalized = input.includes(",") ? input.split(",").pop() || "" : input;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function adminEmail() {
  return getEnv("ADMIN_EMAIL", "imastev@admin.com").toLowerCase();
}

function adminPassword() {
  return getEnv("ADMIN_PASSWORD", "admin@123");
}

function adminSecret() {
  return getEnv("ADMIN_AUTH_SECRET") || getEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function toBase64Url(input: Uint8Array) {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeString(input: string) {
  return new TextEncoder().encode(input);
}

async function signAdminToken(payload: AdminContext & { exp: number }) {
  const body = toBase64Url(encodeString(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    encodeString(adminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encodeString(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifyAdminToken(token: string): Promise<AdminContext | null> {
  if (!token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    encodeString(adminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = Uint8Array.from(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (signature.length % 4 || 4)) % 4)),
    (char) => char.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, encodeString(body));
  if (!valid) return null;

  const payload = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(
        atob(body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4 || 4)) % 4)),
        (char) => char.charCodeAt(0),
      ),
    ),
  ) as AdminContext & { exp?: number };

  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  if (payload.role !== "admin") return null;
  return { email: payload.email, role: "admin" };
}

async function requireAdmin(req: Request) {
  const admin = await verifyAdminToken(getBearerToken(req));
  if (!admin) {
    throw new Response(JSON.stringify({ error: "Invalid admin token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return admin;
}

async function getUserFromRequest(req: Request, service = createServiceClient()): Promise<UserContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email || "",
  };
}

async function ensureLegacyUserRecord(service: SupabaseClient, user: UserContext) {
  const existing = await service.from("users").select("id, email").eq("id", user.id).maybeSingle();
  if (existing.data?.id) return existing.data;

  const byEmail = await service.from("users").select("id, email").eq("email", user.email).maybeSingle();
  if (byEmail.data?.id) {
    throw new Error("A legacy user record already exists for this email with a different ID. Data migration is required for this account.");
  }

  const inserted = await service
    .from("users")
    .insert({
      id: user.id,
      email: user.email,
      password_hash: "supabase-auth-managed",
    })
    .select("id, email")
    .single();

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  return inserted.data;
}

async function ensureUserScaffold(service: SupabaseClient, userId: string) {
  await service.from("profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
  await service.from("user_roles").upsert({ user_id: userId, role: "patient" }, { onConflict: "user_id,role" });

  const { data: freePlan } = await service
    .from("subscription_plans")
    .select("id")
    .eq("tier", "free")
    .limit(1)
    .maybeSingle();

  if (!freePlan?.id) return;

  const { data: existingSubscription } = await service
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", freePlan.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingSubscription?.id) return;

  await service.from("subscriptions").insert({
    user_id: userId,
    plan_id: freePlan.id,
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
    scans_used_this_period: 0,
  });
}

async function verifyGoogleIdToken(idToken: string) {
  const clientId = googleClientId();
  if (!clientId) {
    return { ok: false as const, error: "Google sign-in is not configured" };
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false as const, error: "Google token verification failed" };
  }

  if (String(payload.aud || "") !== clientId) {
    return { ok: false as const, error: "Google token audience mismatch" };
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) {
    return { ok: false as const, error: "Google account email is missing" };
  }

  return {
    ok: true as const,
    profile: {
      email,
      fullName: typeof payload.name === "string" ? payload.name.trim() : "",
      emailVerified: String(payload.email_verified || "") === "true",
    },
  };
}

async function requireUser(req: Request, service = createServiceClient()) {
  const user = await getUserFromRequest(req, service);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    await ensureLegacyUserRecord(service, user);
  } catch (error) {
    throw new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to sync user record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return user;
}

function getPublicBaseUrl(req: Request) {
  const explicit = getEnv("PUBLIC_APP_URL") || getEnv("APP_BASE_URL") || getEnv("FRONTEND_URL");
  if (explicit) return explicit.replace(/\/+$/g, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/g, "");
  return "http://localhost:5173";
}

function getApiBaseUrl() {
  const explicit = getEnv("API_PUBLIC_URL") || getEnv("BACKEND_URL") || getEnv("BACKEND_PUBLIC_URL");
  if (explicit) return explicit.replace(/\/+$/g, "");
  const supabaseUrl = getEnv("SUPABASE_URL");
  return `${supabaseUrl.replace(/\/+$/g, "")}/functions/v1/api`;
}

function generateTransactionRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `IMSTEV-${Date.now()}-${suffix}`;
}

function normalizePaymentType(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["salon_booking", "subscription", "telehealth", "order", "analysis"].includes(normalized)) {
    return normalized;
  }
  return "general";
}

function normalizeMetadata(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
}

function normalizeCommunityType(value: unknown): "hair" | "skin" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return COMMUNITY_TYPES.includes(normalized as "hair" | "skin") ? normalized as "hair" | "skin" : "hair";
}

function normalizeCommunityReaction(value: unknown): "like" | "love" | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return COMMUNITY_REACTIONS.includes(normalized as "like" | "love") ? normalized as "like" | "love" : null;
}

function defaultCommunityAuthor(user: UserContext) {
  const emailPrefix = user.email?.split("@")[0] || "Member";
  return emailPrefix.replace(/[._-]+/g, " ").trim() || "Community Member";
}

function normalizeCommunityImageExtension(contentType: string, fileName: string) {
  const type = String(contentType || "").toLowerCase();
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";

  const ext = (fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "").toLowerCase();
  if (["png", "webp", "gif", "jpg", "jpeg"].includes(ext)) {
    return ext === "jpeg" ? ".jpg" : `.${ext}`;
  }
  return ".jpg";
}

async function getOrCreateMonthlyScanPlan(service: SupabaseClient) {
  const { data: existing } = await service
    .from("subscription_plans")
    .select("id, name, price_ngn, max_scans_per_month, is_active")
    .eq("is_active", true)
    .eq("price_ngn", 10000)
    .eq("max_scans_per_month", 4)
    .order("created_at", { ascending: false })
    .limit(1);

  const existingPlan = ensureArray(existing)[0];
  if (existingPlan) return existingPlan;

  const { data: created, error } = await service
    .from("subscription_plans")
    .insert({
      name: "Monthly Scan Plan",
      tier: "premium",
      price_ngn: 10000,
      features: [
        "4 scans every 30 days",
        "Priority analysis processing",
        "Detailed recommendations",
        "Progress tracking",
      ],
      max_scans_per_month: 4,
      max_family_members: 1,
      includes_telehealth: false,
      includes_custom_formulations: false,
      is_active: true,
    })
    .select("id, name, price_ngn, max_scans_per_month, is_active")
    .single();

  if (error || !created) throw new Error(error?.message || "Unable to create monthly scan plan");
  return created;
}

async function getUserMap(service: SupabaseClient, userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, { email: string | null; created_at: string | null }>();
  if (unique.length === 0) return map;

  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: Math.max(unique.length, 100) });
  for (const user of data.users || []) {
    if (unique.includes(user.id)) {
      map.set(user.id, {
        email: user.email || null,
        created_at: user.created_at || null,
      });
    }
  }
  return map;
}

async function listAdminUsers(service: SupabaseClient) {
  const [authUsers, profiles, roles, subscriptions] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from("profiles").select("user_id, full_name, phone, location, onboarding_completed"),
    service.from("user_roles").select("user_id, role"),
    service.from("subscriptions").select("user_id, status, plan_id").eq("status", "active"),
  ]);

  const profileMap = new Map(ensureArray(profiles.data).map((item) => [item.user_id, item]));
  const roleMap = new Map<string, string[]>();
  for (const role of ensureArray(roles.data)) {
    const items = roleMap.get(role.user_id) || [];
    items.push(role.role);
    roleMap.set(role.user_id, items);
  }

  const planIds = Array.from(new Set(ensureArray(subscriptions.data).map((item) => item.plan_id).filter(Boolean)));
  const { data: plans } = await service.from("subscription_plans").select("id, name").in("id", planIds.length ? planIds : ["00000000-0000-0000-0000-000000000000"]);
  const planMap = new Map(ensureArray(plans).map((plan) => [plan.id, plan.name]));

  return ensureArray(authUsers.data.users)
    .map((user) => {
      const profile = profileMap.get(user.id);
      const subscription = ensureArray(subscriptions.data).find((item) => item.user_id === user.id);
      return {
        id: user.id,
        email: user.email || "",
        created_at: user.created_at,
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        location: profile?.location || null,
        onboarding_completed: profile?.onboarding_completed ?? null,
        roles: roleMap.get(user.id) || [],
        subscription_name: subscription?.plan_id ? planMap.get(subscription.plan_id) || null : null,
        subscription_status: subscription?.status || null,
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

async function sendCheckoutDetails(_req: Request, _user: UserContext, body: Record<string, unknown>) {
  return {
    success: true,
    skipped: true,
    message: "Checkout details recorded. Add an email provider integration if you want transactional emails from Edge Functions.",
    details: body,
  };
}

function quicktellerEnv() {
  const envValue = (getEnv("QUICKTELLER_ENV", "production") || "").toLowerCase();
  const production = ["production", "prod", "live"].includes(envValue);
  
  console.log(`[QUICKTELLER_ENV] Raw value: "${getEnv("QUICKTELLER_ENV")}", Normalized: "${envValue}", Is Production/Live: ${production}`);
  
  return {
    checkoutBase: production ? "https://newwebpay.interswitchng.com" : "https://newwebpay.qa.interswitchng.com",
    webpayBase: production ? "https://webpay.interswitchng.com" : "https://qa.interswitchng.com",
    oauthUrl: production
      ? "https://api.interswitchng.com/passport/oauth/token"
      : "https://qa.interswitchng.com/passport/oauth/token",
    mode: production ? "LIVE" : "TEST",
  };
}

function toMinorUnit(amount: number) {
  return Math.round(amount * 100);
}

async function getQuicktellerToken() {
  const clientId = getEnv("QUICKTELLER_CLIENT_ID");
  const clientSecret = getEnv("QUICKTELLER_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const response = await fetch(quicktellerEnv().oauthUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return payload.access_token || null;
}

async function buildQuicktellerPayment(args: {
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  transactionRef: string;
  redirectUrl: string;
  description: string;
}) {
  const merchantCode = getEnv("QUICKTELLER_MERCHANT_CODE");
  const payItemId = getEnv("QUICKTELLER_PAYMENT_ITEM_ID");
  if (!merchantCode || !payItemId) {
    throw new Error("Quickteller merchant credentials are not configured");
  }

  const env = quicktellerEnv();
  console.log(`[Quickteller Payment] Using merchant_code: ${merchantCode}, pay_item_id: ${payItemId}, mode: ${env.mode}`);
  
  const accessToken = await getQuicktellerToken();
  const amountInMinor = toMinorUnit(args.amount);
  const inlineConfig: Record<string, string | number | undefined> = {
    merchant_code: merchantCode,
    pay_item_id: payItemId,
    pay_item_name: args.description || "IMSTEV NATURALS Payment",
    txn_ref: args.transactionRef,
    amount: amountInMinor,
    currency: 566, // Numeric, not string
    site_redirect_url: args.redirectUrl,
    cust_id: args.customerEmail,
    cust_name: args.customerName,
    cust_email: args.customerEmail,
    cust_mobile_no: args.customerPhone,
    mode: env.mode,
  };

  if (accessToken) inlineConfig.access_token = accessToken;

  console.log(`[Quickteller InlineConfig] Amount in Minor Units: ${amountInMinor}, Config: ${JSON.stringify(inlineConfig)}`);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(inlineConfig)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  return {
    inlineConfig,
    paymentUrl: `${env.checkoutBase}/collections/w/pay?${params.toString()}`,
    scriptUrl: `${env.checkoutBase}/inline-checkout.js`,
  };
}

function parseQuicktellerResponseCode(payload: Record<string, unknown>) {
  return String(payload.ResponseCode || payload.responseCode || payload.response_code || payload.respCode || "");
}

function parseQuicktellerPaymentRef(payload: Record<string, unknown>) {
  return String(payload.PaymentReference || payload.paymentReference || payload.payment_ref || payload.payRef || "");
}

function parseQuicktellerMerchantRef(payload: Record<string, unknown>) {
  return String(
    payload.MerchantReference ||
      payload.merchantReference ||
      payload.transactionReference ||
      payload.transactionreference ||
      payload.txnref ||
      "",
  );
}

function parseQuicktellerAmount(payload: Record<string, unknown>) {
  const raw = payload.Amount ?? payload.amount;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric >= 100 ? numeric / 100 : numeric;
}

async function verifyQuicktellerPayment(transactionRef: string, amountNgn?: number) {
  const merchantCode = getEnv("QUICKTELLER_MERCHANT_CODE");
  if (!merchantCode) {
    throw new Error("Quickteller merchant code is not configured");
  }

  const params = new URLSearchParams({
    merchantcode: merchantCode,
    transactionreference: transactionRef,
  });

  if (Number.isFinite(amountNgn || NaN)) {
    params.set("amount", String(toMinorUnit(amountNgn as number)));
  }

  const env = quicktellerEnv();
  const headers: HeadersInit[] = [{ Accept: "application/json" }];
  const accessToken = await getQuicktellerToken();
  if (accessToken) {
    headers.push({ Accept: "application/json", Authorization: `Bearer ${accessToken}` });
  }

  let lastPayload: Record<string, unknown> | null = null;
  for (const header of headers) {
    const response = await fetch(`${env.webpayBase}/collections/api/v1/gettransaction.json?${params.toString()}`, {
      method: "GET",
      headers: header,
    });
    if (response.ok) {
      lastPayload = await response.json();
      break;
    }
  }

  if (!lastPayload) {
    return { success: false, status: "failed", error: "Unable to verify transaction" };
  }

  const responseCode = parseQuicktellerResponseCode(lastPayload);
  const merchantRef = parseQuicktellerMerchantRef(lastPayload) || transactionRef;
  const paymentRef = parseQuicktellerPaymentRef(lastPayload);
  const amount = parseQuicktellerAmount(lastPayload);

  if (responseCode === "00") {
    return { success: true, status: "successful", amount, transactionRef: merchantRef, paymentRef, responseCode, raw: lastPayload };
  }
  if (["09", "10", "11"].includes(responseCode)) {
    return { success: true, status: "pending", amount, transactionRef: merchantRef, paymentRef, responseCode, raw: lastPayload };
  }
  return {
    success: false,
    status: "failed",
    amount,
    transactionRef: merchantRef,
    paymentRef,
    responseCode,
    error: String(lastPayload.ResponseDescription || lastPayload.responseDescription || "Payment failed"),
    raw: lastPayload,
  };
}

async function maybeCreateDailyRoom(name: string, scheduledAt: string, durationMinutes: number) {
  const apiKey = getEnv("DAILY_API_KEY");
  if (!apiKey) {
    return { url: `https://glowsense.daily.co/${name}` };
  }

  const response = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: "local",
        max_participants: 2,
        exp: Math.floor(new Date(scheduledAt).getTime() / 1000) + (durationMinutes * 60) + 3600,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Daily room: ${await response.text()}`);
  }

  return await response.json();
}

async function createDailyMeetingToken(roomName: string, userName: string, isOwner: boolean) {
  const apiKey = getEnv("DAILY_API_KEY");
  if (!apiKey) {
    return `mock-token-${Date.now()}`;
  }

  const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create meeting token: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const service = createServiceClient();
  const url = new URL(req.url);
  const segments = getSegments(url.pathname);
  const route = `/${segments.join("/")}`;

  try {
    const body =
      req.method === "GET" || req.method === "DELETE" || (route === "/payment/callback" && req.method === "POST")
        ? {}
        : await parseJson(req);

    if (route === "/health" && req.method === "GET") {
      return json({ status: "ok", timestamp: new Date().toISOString() });
    }

    if (route === "/auth/signup" && req.method === "POST") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) return json({ error: "Email and password required" }, 400);

      const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) {
        return json({ error: created.error?.message || "Failed to create user" }, 400);
      }

      const appUser = { id: created.data.user.id, email: created.data.user.email || email };
      try {
        await ensureLegacyUserRecord(service, appUser);
      } catch (error) {
        await service.auth.admin.deleteUser(created.data.user.id);
        return json({ error: error instanceof Error ? error.message : "Failed to create user profile" }, 400);
      }

      await service.from("profiles").upsert({ user_id: created.data.user.id }, { onConflict: "user_id" });
      await service.from("user_roles").upsert({ user_id: created.data.user.id, role: "patient" }, { onConflict: "user_id,role" });

      const { data: freePlan } = await service
        .from("subscription_plans")
        .select("id")
        .eq("tier", "free")
        .limit(1)
        .maybeSingle();

      if (freePlan?.id) {
        await service.from("subscriptions").insert({
          user_id: created.data.user.id,
          plan_id: freePlan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
          scans_used_this_period: 0,
        });
      }

      const anon = createAnonClient();
      const signedIn = await anon.auth.signInWithPassword({ email, password });
      return json({
        user: { id: created.data.user.id, email: created.data.user.email, created_at: created.data.user.created_at },
        token: signedIn.data.session?.access_token || null,
      });
    }

    if (route === "/auth/signin" && req.method === "POST") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) return json({ error: "Email and password required" }, 400);

      const anon = createAnonClient();
      const signedIn = await anon.auth.signInWithPassword({ email, password });
      if (signedIn.error || !signedIn.data.user || !signedIn.data.session) {
        return json({ error: "Invalid credentials" }, 401);
      }

      try {
        await ensureLegacyUserRecord(service, {
          id: signedIn.data.user.id,
          email: signedIn.data.user.email || email,
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Failed to sync user account" }, 400);
      }

      return json({
        user: {
          id: signedIn.data.user.id,
          email: signedIn.data.user.email,
          created_at: signedIn.data.user.created_at,
        },
        token: signedIn.data.session.access_token,
      });
    }

    if (route === "/auth/google" && req.method === "POST") {
      const credential = typeof body.credential === "string" ? body.credential.trim() : "";
      if (!credential) return json({ error: "Google credential is required" }, 400);

      const verified = await verifyGoogleIdToken(credential);
      if (!verified.ok) {
        return json({ error: verified.error }, 401);
      }

      const { data: existingUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = ensureArray(existingUsers?.users).find(
        (candidate) => (candidate.email || "").trim().toLowerCase() === verified.profile.email
      );

      let authUser = existingUser || null;

      if (!authUser) {
        const created = await service.auth.admin.createUser({
          email: verified.profile.email,
          email_confirm: verified.profile.emailVerified || true,
          user_metadata: verified.profile.fullName ? { full_name: verified.profile.fullName } : undefined,
        });

        if (created.error || !created.data.user) {
          return json({ error: created.error?.message || "Failed to create Google user" }, 400);
        }

        authUser = created.data.user;
      }

      const appUser = {
        id: authUser.id,
        email: authUser.email || verified.profile.email,
      };

      try {
        await ensureLegacyUserRecord(service, appUser);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Failed to sync user account" }, 400);
      }

      await ensureUserScaffold(service, authUser.id);

      if (verified.profile.fullName) {
        await service
          .from("profiles")
          .update({ full_name: verified.profile.fullName })
          .eq("user_id", authUser.id)
          .is("full_name", null);
      }

      const anon = createAnonClient();
      const signedIn = await anon.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      });

      if (signedIn.error || !signedIn.data.user || !signedIn.data.session) {
        return json({ error: signedIn.error?.message || "Google sign-in failed" }, 401);
      }

      return json({
        user: {
          id: signedIn.data.user.id,
          email: signedIn.data.user.email,
          created_at: signedIn.data.user.created_at,
        },
        token: signedIn.data.session.access_token,
      });
    }

    if (route === "/auth/user" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: profile } = await service.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      return json({
        user: {
          id: user.id,
          email: user.email,
          profile,
        },
      });
    }

    if (route === "/auth/refresh" && req.method === "POST") {
      const token = getBearerToken(req);
      const user = await getUserFromRequest(req, service);
      if (!user) return json({ error: "Invalid token" }, 401);
      return json({ token });
    }

    if (route === "/admin/login" && req.method === "POST") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (email !== adminEmail() || password !== adminPassword()) {
        return json({ error: "Invalid admin credentials" }, 401);
      }
      const token = await signAdminToken({
        email,
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
      });
      return json({ admin: { email, role: "admin" }, token });
    }

    if (route === "/admin/me" && req.method === "GET") {
      const admin = await requireAdmin(req);
      return json({ admin });
    }

    if (route === "/admin/overview" && req.method === "GET") {
      await requireAdmin(req);
      const [users, products, orders, appointments, salonBookings] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("products").select("id, stock_quantity, is_active", { count: "exact" }),
        service.from("orders").select("id, total_amount_ngn, status, payment_status", { count: "exact" }),
        service.from("appointments").select("id", { count: "exact" }),
        service.from("salon_appointments").select("id", { count: "exact" }),
      ]);

      const orderRows = ensureArray(orders.data);
      const totalRevenue = orderRows.reduce((sum, order) => {
        const paid = ["paid", "successful"].includes(String(order.payment_status || "").toLowerCase()) ||
          ["processing", "completed"].includes(String(order.status || "").toLowerCase());
        return paid ? sum + Number(order.total_amount_ngn || 0) : sum;
      }, 0);

      return json({
        stats: {
          totalUsers: ensureArray(users.data.users).length,
          totalProducts: products.count || 0,
          totalOrders: orders.count || 0,
          totalAppointments: appointments.count || 0,
          totalSalonBookings: salonBookings.count || 0,
          totalRevenue,
          pendingOrders: orderRows.filter((order) => String(order.status || "").toLowerCase() === "pending").length,
          lowStockProducts: ensureArray(products.data).filter((product) => product.is_active && Number(product.stock_quantity || 0) <= 10).length,
        },
      });
    }

    if (route === "/admin/users" && req.method === "GET") {
      await requireAdmin(req);
      return json(await listAdminUsers(service));
    }

    if (route.startsWith("/admin/users/") && req.method === "GET") {
      await requireAdmin(req);
      const userId = segments[2];
      const userList = await listAdminUsers(service);
      const user = userList.find((item) => item.id === userId);
      if (!user) return json({ error: "User not found" }, 404);
      const { data: profile } = await service.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return json({ ...user, ...profile });
    }

    if (route === "/admin/users" && req.method === "POST") {
      await requireAdmin(req);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) return json({ error: "Email and password are required" }, 400);

      const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) {
        return json({ error: created.error?.message || "Failed to create user" }, 400);
      }

      await service.from("profiles").upsert({
        user_id: created.data.user.id,
        full_name: body.full_name || null,
        phone: body.phone || null,
        location: body.location || null,
        onboarding_completed: false,
      }, { onConflict: "user_id" });

      const roles = Array.isArray(body.roles) && body.roles.length ? body.roles : ["patient"];
      await service.from("user_roles").delete().eq("user_id", created.data.user.id);
      await service.from("user_roles").insert(roles.map((role: string) => ({ user_id: created.data.user.id, role })));

      const users = await listAdminUsers(service);
      const createdUser = users.find((item) => item.id === created.data.user.id);
      return json(createdUser, 201);
    }

    if (route.startsWith("/admin/users/") && req.method === "PUT") {
      await requireAdmin(req);
      const userId = segments[2];
      const updateData: Record<string, unknown> = {};
      if (typeof body.email === "string" && body.email.trim()) {
        updateData.email = body.email.trim().toLowerCase();
      }
      if (typeof body.password === "string" && body.password.trim()) {
        updateData.password = body.password;
      }
      if (Object.keys(updateData).length > 0) {
        const result = await service.auth.admin.updateUserById(userId, updateData);
        if (result.error) return json({ error: result.error.message }, 400);
      }

      await service.from("profiles").upsert({
        user_id: userId,
        full_name: body.full_name || null,
        phone: body.phone || null,
        location: body.location || null,
        onboarding_completed: typeof body.onboarding_completed === "boolean" ? body.onboarding_completed : null,
      }, { onConflict: "user_id" });

      if (Array.isArray(body.roles)) {
        await service.from("user_roles").delete().eq("user_id", userId);
        if (body.roles.length) {
          await service.from("user_roles").insert(body.roles.map((role: string) => ({ user_id: userId, role })));
        }
      }

      const users = await listAdminUsers(service);
      const updated = users.find((item) => item.id === userId);
      if (!updated) return json({ error: "User not found" }, 404);
      return json(updated);
    }

    if (route.startsWith("/admin/users/") && req.method === "DELETE") {
      await requireAdmin(req);
      const userId = segments[2];
      await Promise.all([
        service.from("user_roles").delete().eq("user_id", userId),
        service.from("profiles").delete().eq("user_id", userId),
        service.from("subscriptions").delete().eq("user_id", userId),
        service.from("orders").delete().eq("user_id", userId),
        service.from("scans").delete().eq("user_id", userId),
      ]);
      const result = await service.auth.admin.deleteUser(userId);
      if (result.error) return json({ error: result.error.message }, 400);
      return json({ success: true });
    }

    if (route === "/admin/products" && req.method === "GET") {
      await requireAdmin(req);
      const { data, error } = await service.from("products").select("*").order("updated_at", { ascending: false }).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route.startsWith("/admin/products/") && req.method === "GET") {
      await requireAdmin(req);
      const { data, error } = await service.from("products").select("*").eq("id", segments[2]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Product not found" }, 404);
      return json(data);
    }

    if (route === "/admin/products" && req.method === "POST") {
      await requireAdmin(req);
      const payload = sanitizePayload(body, PRODUCT_FIELDS);
      const { data, error } = await service.from("products").insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route.startsWith("/admin/products/") && req.method === "PUT") {
      await requireAdmin(req);
      const payload = sanitizePayload(body, PRODUCT_FIELDS);
      const { data, error } = await service.from("products").update(payload).eq("id", segments[2]).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Product not found" }, 404);
      return json(data);
    }

    if (route.startsWith("/admin/products/") && req.method === "DELETE") {
      await requireAdmin(req);
      const productId = segments[2];
      await service.from("order_items").delete().eq("product_id", productId);
      const { error } = await service.from("products").delete().eq("id", productId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (route === "/admin/orders" && req.method === "GET") {
      await requireAdmin(req);
      const { data: orders, error } = await service.from("orders").select("*").order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const itemsRes = await service.from("order_items").select("*");
      const itemRows = ensureArray(itemsRes.data);
      const productMap = new Map<string, string>();
      const orderUserIds = ensureArray(orders).map((order) => order.user_id).filter(Boolean);
      const userMap = await getUserMap(service, orderUserIds);
      const { data: profiles } = await service.from("profiles").select("user_id, full_name").in("user_id", orderUserIds.length ? orderUserIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: products } = await service.from("products").select("id, name");
      for (const product of ensureArray(products)) productMap.set(product.id, product.name);
      const profileMap = new Map(ensureArray(profiles).map((profile) => [profile.user_id, profile.full_name]));

      return json(ensureArray(orders).map((order) => ({
        ...order,
        user_email: userMap.get(order.user_id)?.email || null,
        customer_name: profileMap.get(order.user_id) || null,
        items: itemRows
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price_ngn,
            product_name: productMap.get(item.product_id) || "Product",
          })),
      })));
    }

    if (route.startsWith("/admin/orders/") && req.method === "PUT") {
      await requireAdmin(req);
      const allowed = ["status", "payment_status", "notes"];
      const payload = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const { data, error } = await service.from("orders").update(payload).eq("id", segments[2]).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Order not found" }, 404);
      return json(data);
    }

    if (route === "/admin/appointments" && req.method === "GET") {
      await requireAdmin(req);
      const { data: appointments, error } = await service.from("appointments").select("*").order("scheduled_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const clinicianIds = ensureArray(appointments).map((item) => item.clinician_id).filter(Boolean);
      const patientIds = ensureArray(appointments).map((item) => item.patient_user_id).filter(Boolean);
      const { data: clinicians } = await service.from("clinicians").select("*").in("id", clinicianIds.length ? clinicianIds : ["00000000-0000-0000-0000-000000000000"]);
      const clinicianUserIds = ensureArray(clinicians).map((item) => item.user_id).filter(Boolean);
      const { data: clinicianProfiles } = await service.from("profiles").select("user_id, full_name").in("user_id", clinicianUserIds.length ? clinicianUserIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: patientProfiles } = await service.from("profiles").select("user_id, full_name").in("user_id", patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"]);
      const userMap = await getUserMap(service, patientIds);
      const clinicianMap = new Map(ensureArray(clinicians).map((item) => [item.id, item]));
      const clinicianProfileMap = new Map(ensureArray(clinicianProfiles).map((item) => [item.user_id, item.full_name]));
      const patientProfileMap = new Map(ensureArray(patientProfiles).map((item) => [item.user_id, item.full_name]));

      return json(ensureArray(appointments).map((appointment) => {
        const clinician = clinicianMap.get(appointment.clinician_id);
        return {
          ...appointment,
          clinician_name: clinician ? clinicianProfileMap.get(clinician.user_id) || null : null,
          clinician_specialty: clinician?.specialty || null,
          patient_name: patientProfileMap.get(appointment.patient_user_id) || null,
          patient_email: userMap.get(appointment.patient_user_id)?.email || null,
        };
      }));
    }

    if (route.startsWith("/admin/appointments/") && req.method === "PUT") {
      await requireAdmin(req);
      const allowed = ["status", "notes", "prescription", "follow_up_date"];
      const payload = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const { data, error } = await service.from("appointments").update(payload).eq("id", segments[2]).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Appointment not found" }, 404);
      return json(data);
    }

    if (route === "/admin/salon-bookings" && req.method === "GET") {
      await requireAdmin(req);
      const { data, error } = await service.from("salon_appointments").select("*").order("appointment_date", { ascending: false }).order("time_slot", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route.startsWith("/admin/salon-bookings/") && req.method === "PUT") {
      await requireAdmin(req);
      const allowed = ["status", "payment_status", "notes"];
      const payload = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const { data, error } = await service.from("salon_appointments").update(payload).eq("id", Number(segments[2])).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Salon booking not found" }, 404);
      return json(data);
    }

    if (route === "/profiles" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/profiles" && (req.method === "POST" || req.method === "PUT")) {
      const user = await requireUser(req, service);
      const payload = sanitizePayload(body, PROFILE_FIELDS);
      const { data, error } = await service.from("profiles").upsert({ ...payload, user_id: user.id }, { onConflict: "user_id" }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route === "/subscription-plans" && req.method === "GET") {
      const { data, error } = await service.from("subscription_plans").select("*").eq("is_active", true).order("price_ngn");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/subscriptions" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: subscriptions, error } = await service
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return json({ error: error.message }, 500);
      const subscription = ensureArray(subscriptions)[0];
      if (!subscription) return json(null);
      const { data: plan } = await service.from("subscription_plans").select("*").eq("id", subscription.plan_id).maybeSingle();
      return json({ ...subscription, subscription_plans: plan });
    }

    if (route === "/subscriptions" && req.method === "POST") {
      const user = await requireUser(req, service);
      if (!body.plan_id) return json({ error: "plan_id is required" }, 400);
      await service.from("subscriptions").update({ status: "cancelled" }).eq("user_id", user.id).eq("status", "active");
      const payload = {
        user_id: user.id,
        plan_id: body.plan_id,
        status: body.status || "active",
        current_period_start: body.current_period_start || null,
        current_period_end: body.current_period_end || null,
        scans_used_this_period: 0,
      };
      const { data, error } = await service.from("subscriptions").insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route === "/products" && req.method === "GET") {
      let query = service.from("products").select("*").eq("is_active", true);
      if (url.searchParams.get("type") && url.searchParams.get("type") !== "all") {
        const productType = url.searchParams.get("type")!;
        query = query.or(`product_type.eq.${productType},product_type.eq.both`);
      }
      if (url.searchParams.get("category") && url.searchParams.get("category") !== "all") {
        query = query.eq("category", url.searchParams.get("category")!);
      }
      const { data, error } = await query.order("name");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route.startsWith("/products/") && req.method === "GET") {
      const { data, error } = await service.from("products").select("*").eq("id", segments[1]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/cart" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: cartItems, error } = await service.from("cart_items").select("*").eq("user_id", user.id);
      if (error) return json({ error: error.message }, 500);
      const productIds = ensureArray(cartItems).map((item) => item.product_id);
      const { data: products } = await service.from("products").select("id, name, price_ngn, image_url, stock_quantity").in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);
      const productMap = new Map(ensureArray(products).map((item) => [item.id, item]));
      return json(ensureArray(cartItems).map((item) => {
        const product = productMap.get(item.product_id) || {};
        return {
          id: item.id,  // Preserve the actual cart_items.id
          user_id: item.user_id,
          product_id: item.product_id,
          quantity: item.quantity,
          created_at: item.created_at,
          updated_at: item.updated_at,
          name: product.name,
          price_ngn: product.price_ngn,
          image_url: product.image_url,
          stock_quantity: product.stock_quantity,
        };
      }));
    }

    if (route === "/cart" && req.method === "POST") {
      const user = await requireUser(req, service);
      const productId = body.product_id;
      const quantity = Number(body.quantity || 1);
      const { data: existing } = await service.from("cart_items").select("*").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
      if (existing) {
        const { data, error } = await service
          .from("cart_items")
          .update({ quantity: Number(existing.quantity || 0) + quantity })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }
      const { data, error } = await service.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route.startsWith("/cart/") && req.method === "PUT") {
      const user = await requireUser(req, service);
      const { data, error } = await service
        .from("cart_items")
        .update({ quantity: Number(body.quantity || 1) })
        .eq("id", segments[1])
        .eq("user_id", user.id)
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route.startsWith("/cart/") && req.method === "DELETE") {
      const user = await requireUser(req, service);
      const cartItemId = segments[1];
      const now = new Date().toISOString();
      
      console.log(`[DELETE /cart/${cartItemId}] User ID: ${user.id}`);
      
      // Delete the cart item
      const { error: deleteError } = await service
        .from("cart_items")
        .delete()
        .eq("id", cartItemId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.log(`[DELETE /cart] Delete error: ${deleteError.message}`);
        return json({ 
          success: false, 
          error: deleteError.message, 
          timestamp: now 
        }, 400);
      }

      console.log(`[DELETE /cart/${cartItemId}] Successfully deleted`);

      return json({ 
        success: true,
        deleted: true,
        item_id: cartItemId,
        timestamp: now
      }, 200);
    }

    if (route === "/cart/debug" && req.method === "GET") {
      const user = await requireUser(req, service);
      console.log(`[DEBUG /cart] Fetching debug info for user ${user.id}`);
      
      // Get all cart items for this user
      const { data: cartItems, error: cartError } = await service
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id);
      
      if (cartError) {
        return json({ error: cartError.message }, 400);
      }
      
      // Get all cart items in the entire table (for comparison)
      const { data: allCartItems, error: allError } = await service
        .from("cart_items")
        .select("id, user_id, product_id, quantity");
      
      if (allError) {
        return json({ error: allError.message }, 400);
      }
      
      return json({
        auth_user_id: user.id,
        user_cart_items: cartItems,
        user_cart_count: cartItems?.length || 0,
        all_cart_items_count: allCartItems?.length || 0,
        all_cart_items: allCartItems,
        timestamp: new Date().toISOString()
      });
    }

    if (route === "/scan-quota" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: subscriptions } = await service
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      const subscription = ensureArray(subscriptions)[0];
      if (!subscription) {
        return json({
          hasSubscription: false,
          planName: "Starter",
          tier: "free",
          scansUsed: 0,
          maxScans: 3,
          scansRemaining: 3,
          isUnlimited: false,
        });
      }
      const { data: plan } = await service.from("subscription_plans").select("*").eq("id", subscription.plan_id).maybeSingle();
      const maxScans = plan?.max_scans_per_month ?? 3;
      const scansUsed = Number(subscription.scans_used_this_period || 0);
      const isUnlimited = maxScans === null;
      return json({
        hasSubscription: true,
        planName: plan?.name || "Plan",
        tier: String(plan?.tier || plan?.name || "").toLowerCase(),
        scansUsed,
        maxScans,
        scansRemaining: isUnlimited ? null : Math.max(0, maxScans - scansUsed),
        isUnlimited,
      });
    }

    if (route === "/scans" && req.method === "POST") {
      const user = await requireUser(req, service);
      const { data: subscriptions } = await service
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      const subscription = ensureArray(subscriptions)[0];
      let maxScans: number | null = 3;
      if (subscription?.plan_id) {
        const { data: plan } = await service.from("subscription_plans").select("max_scans_per_month").eq("id", subscription.plan_id).maybeSingle();
        maxScans = plan?.max_scans_per_month ?? 3;
      }
      const scansUsed = Number(subscription?.scans_used_this_period || 0);
      if (maxScans !== null && scansUsed >= maxScans) {
        return json({
          error: "Scan limit reached",
          message: "You have used all your scans for this period. Upgrade your plan for more scans.",
          scansUsed,
          maxScans,
        }, 403);
      }

      const payload = {
        ...body,
        user_id: user.id,
        scan_type: typeof body.scan_type === "string" ? body.scan_type : "skin",
        status: body.status || "pending",
      };
      const { data, error } = await service.from("scans").insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);

      if (subscription?.id) {
        await service
          .from("subscriptions")
          .update({ scans_used_this_period: scansUsed + 1 })
          .eq("id", subscription.id);
      }

      return json(data);
    }

    if (route === "/scans" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: scans, error } = await service.from("scans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const scanIds = ensureArray(scans).map((scan) => scan.id);
      const { data: diagnoses } = await service.from("diagnoses").select("*").in("scan_id", scanIds.length ? scanIds : ["00000000-0000-0000-0000-000000000000"]);
      return json(ensureArray(scans).map((scan) => ({
        ...scan,
        diagnoses: ensureArray(diagnoses).filter((diagnosis) => diagnosis.scan_id === scan.id),
      })));
    }

    if (route.startsWith("/scans/") && req.method === "GET") {
      const user = await requireUser(req, service);
      const scanId = segments[1];
      const { data: scan, error } = await service.from("scans").select("*").eq("id", scanId).eq("user_id", user.id).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!scan) return json(null);
      const { data: diagnoses } = await service.from("diagnoses").select("*").eq("scan_id", scanId);
      return json({ ...scan, diagnoses: diagnoses || [] });
    }

    if (route.startsWith("/analyze/") && req.method === "POST") {
      return json({ error: "Call the dedicated Supabase edge analysis functions directly." }, 501);
    }

    if (route === "/clinicians" && req.method === "GET") {
      const { data: clinicians, error } = await service.from("clinicians").select("*").eq("is_verified", true).order("rating", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const userIds = ensureArray(clinicians).map((item) => item.user_id);
      const { data: profiles } = await service.from("profiles").select("user_id, full_name").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const profileMap = new Map(ensureArray(profiles).map((item) => [item.user_id, item.full_name]));
      return json(ensureArray(clinicians).map((item) => ({ ...item, full_name: profileMap.get(item.user_id) || null })));
    }

    if (route === "/appointments" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: clinicians } = await service.from("clinicians").select("id").eq("user_id", user.id).limit(1);
      const clinicianId = ensureArray(clinicians)[0]?.id || null;
      const { data: appointments, error } = await service
        .from("appointments")
        .select("*")
        .or(`patient_user_id.eq.${user.id}${clinicianId ? `,clinician_id.eq.${clinicianId}` : ""}`)
        .order("scheduled_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const appointmentRows = ensureArray(appointments);
      const clinicianIds = appointmentRows.map((item) => item.clinician_id);
      const patientIds = appointmentRows.map((item) => item.patient_user_id);
      const scanIds = appointmentRows.map((item) => item.scan_id).filter(Boolean);
      const clinicianUsersRes = await service.from("clinicians").select("id, user_id, specialty").in("id", clinicianIds.length ? clinicianIds : ["00000000-0000-0000-0000-000000000000"]);
      const clinicianUsers = ensureArray(clinicianUsersRes.data);
      const clinicianUserIds = clinicianUsers.map((item) => item.user_id);
      const [clinicianProfiles, patientProfiles, scanRows] = await Promise.all([
        service.from("profiles").select("user_id, full_name").in("user_id", clinicianUserIds.length ? clinicianUserIds : ["00000000-0000-0000-0000-000000000000"]),
        service.from("profiles").select("user_id, full_name, age").in("user_id", patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"]),
        service.from("scans").select("id, image_url").in("id", scanIds.length ? scanIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const clinicianMap = new Map(clinicianUsers.map((item) => [item.id, item]));
      const clinicianNameMap = new Map(ensureArray(clinicianProfiles.data).map((item) => [item.user_id, item.full_name]));
      const patientMap = new Map(ensureArray(patientProfiles.data).map((item) => [item.user_id, item]));
      const scanMap = new Map(ensureArray(scanRows.data).map((item) => [item.id, item]));

      return json(appointmentRows.map((appointment) => {
        const clinician = clinicianMap.get(appointment.clinician_id);
        return {
          ...appointment,
          clinicians: clinician ? {
            specialty: clinician.specialty,
            profiles: {
              full_name: clinicianNameMap.get(clinician.user_id) || null,
            },
          } : null,
          profiles: patientMap.get(appointment.patient_user_id) || null,
          scans: appointment.scan_id ? scanMap.get(appointment.scan_id) || null : null,
        };
      }));
    }

    if (route === "/user-roles" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("user_roles").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/appointments" && req.method === "POST") {
      const user = await requireUser(req, service);
      const durationMinutes = Number(body.duration_minutes || 30);
      let meetingUrl = null;
      try {
        const room = await maybeCreateDailyRoom(`imstev-${crypto.randomUUID().slice(0, 8)}`, String(body.scheduled_at), durationMinutes);
        meetingUrl = room.url;
      } catch (error) {
        console.warn("Daily room creation skipped:", error);
      }
      const { data, error } = await service.from("appointments").insert({
        patient_user_id: user.id,
        clinician_id: body.clinician_id,
        scheduled_at: body.scheduled_at,
        duration_minutes: durationMinutes,
        meeting_url: meetingUrl,
        status: "scheduled",
        notes: body.notes || null,
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route.startsWith("/appointments/") && req.method === "PUT") {
      const user = await requireUser(req, service);
      const appointmentId = segments[1];
      const { data: appointment } = await service.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      if (!appointment) return json({ error: "Appointment not found" }, 404);
      const { data: clinicianOwner } = await service.from("clinicians").select("id").eq("id", appointment.clinician_id).eq("user_id", user.id).maybeSingle();
      if (appointment.patient_user_id !== user.id && !clinicianOwner) {
        return json({ error: "Not authorized to update this appointment" }, 403);
      }
      const allowed = ["status", "notes", "prescription", "follow_up_date"];
      const payload = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const { data, error } = await service.from("appointments").update(payload).eq("id", appointmentId).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    if (route.startsWith("/appointments/") && segments[2] === "join" && req.method === "POST") {
      const user = await requireUser(req, service);
      const appointmentId = segments[1];
      const { data: appointment } = await service.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      if (!appointment) return json({ error: "Appointment not found" }, 404);
      if (appointment.patient_user_id !== user.id) {
        const { data: clinicianOwner } = await service.from("clinicians").select("id").eq("id", appointment.clinician_id).eq("user_id", user.id).maybeSingle();
        if (!clinicianOwner) return json({ error: "Not authorized to join this appointment" }, 403);
      }
      const { data: profile } = await service.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      const roomName = String(appointment.meeting_url || "").split("/").pop() || `imstev-${appointmentId}`;
      const token = await createDailyMeetingToken(roomName, profile?.full_name || user.email, appointment.patient_user_id !== user.id);
      return json({
        meeting_url: appointment.meeting_url,
        token,
        room_name: roomName,
        appointment,
      });
    }

    if (route === "/family-accounts" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: accounts, error } = await service.from("family_accounts").select("*").eq("parent_user_id", user.id);
      if (error) return json({ error: error.message }, 500);
      const childIds = ensureArray(accounts).map((item) => item.child_user_id);
      const { data: profiles } = await service.from("profiles").select("user_id, full_name, age").in("user_id", childIds.length ? childIds : ["00000000-0000-0000-0000-000000000000"]);
      const profileMap = new Map(ensureArray(profiles).map((item) => [item.user_id, item]));
      return json(ensureArray(accounts).map((account) => ({
        ...account,
        profiles: profileMap.get(account.child_user_id) || null,
      })));
    }

    if (route === "/family-accounts" && req.method === "POST") {
      const user = await requireUser(req, service);
      if (!body.child_user_id || !body.relationship) {
        return json({ error: "child_user_id and relationship are required" }, 400);
      }
      const { data: subscriptions } = await service.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1);
      const subscription = ensureArray(subscriptions)[0];
      let maxFamilyMembers = 1;
      if (subscription?.plan_id) {
        const { data: plan } = await service.from("subscription_plans").select("max_family_members").eq("id", subscription.plan_id).maybeSingle();
        maxFamilyMembers = plan?.max_family_members ?? 1;
      }
      const { count } = await service.from("family_accounts").select("*", { count: "exact", head: true }).eq("parent_user_id", user.id);
      const allowedDependents = maxFamilyMembers === null ? Number.MAX_SAFE_INTEGER : Math.max(0, maxFamilyMembers - 1);
      if ((count || 0) >= allowedDependents) {
        return json({ error: "Family member limit reached for your current plan" }, 403);
      }
      const { data, error } = await service.from("family_accounts").upsert({
        parent_user_id: user.id,
        child_user_id: body.child_user_id,
        relationship: body.relationship,
      }, { onConflict: "parent_user_id,child_user_id" }).select().single();
      if (error) return json({ error: error.message }, 400);
      const { data: profile } = await service.from("profiles").select("full_name, age").eq("user_id", body.child_user_id).maybeSingle();
      return json({ ...data, profiles: profile });
    }

    if (route.startsWith("/family-accounts/") && req.method === "DELETE") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("family_accounts").delete().eq("id", segments[1]).eq("parent_user_id", user.id).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Family member not found" }, 404);
      return json({ success: true });
    }

    if ((route === "/formulations" || route === "/custom-formulations") && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("custom_formulations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/formulations/generate" && req.method === "POST") {
      const user = await requireUser(req, service);
      const diagnosisId = body.diagnosis_id;
      if (!diagnosisId) return json({ error: "diagnosis_id is required" }, 400);
      const { data: diagnosis } = await service.from("diagnoses").select("*").eq("id", diagnosisId).eq("user_id", user.id).maybeSingle();
      if (!diagnosis) return json({ error: "Diagnosis not found" }, 404);
      const generated = {
        user_id: user.id,
        diagnosis_id: diagnosisId,
        formulation_name: `Custom ${diagnosis.analysis_type === "hair" ? "Hair" : "Skin"} Treatment`,
        ingredients: {
          "Active Ingredient 1": 2,
          "Active Ingredient 2": 1.5,
          "Base Formula": 85,
          Preservative: 0.5,
          "Essential Oil": 1,
        },
        instructions: "Apply to affected areas twice daily. Perform a patch test before first use.",
        expected_benefits: ["Improved condition", "Better hydration", "Reduced symptoms"],
        contraindications: "Avoid if pregnant or nursing. Do not use on broken skin.",
        estimated_cost_ngn: 8500,
      };
      const { data, error } = await service.from("custom_formulations").insert(generated).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ formulation: data });
    }

    if (route === "/orders" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: orders, error } = await service.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const orderIds = ensureArray(orders).map((order) => order.id);
      const { data: items } = await service.from("order_items").select("*").in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]);
      const productIds = ensureArray(items).map((item) => item.product_id);
      const { data: products } = await service.from("products").select("id, name").in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);
      const productMap = new Map(ensureArray(products).map((product) => [product.id, product.name]));
      return json(ensureArray(orders).map((order) => ({
        ...order,
        items: ensureArray(items)
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price_ngn,
            product_name: productMap.get(item.product_id) || "Product",
          })),
      })));
    }

    if (route === "/orders" && req.method === "POST") {
      const user = await requireUser(req, service);
      const { data: cartItems } = await service.from("cart_items").select("*").eq("user_id", user.id);
      if (!ensureArray(cartItems).length) return json({ error: "Cart is empty" }, 400);
      const productIds = ensureArray(cartItems).map((item) => item.product_id);
      const { data: products } = await service.from("products").select("id, price_ngn").in("id", productIds);
      const priceMap = new Map(ensureArray(products).map((item) => [item.id, Number(item.price_ngn || 0)]));
      const total = ensureArray(cartItems).reduce((sum, item) => sum + (priceMap.get(item.product_id) || 0) * Number(item.quantity || 0), 0);
      const orderNumberRes = await service.rpc("generate_order_number");
      const orderNumber = typeof orderNumberRes.data === "string" ? orderNumberRes.data : `ORD-${Date.now()}`;
      const { data: order, error } = await service.from("orders").insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount_ngn: total,
        shipping_address: body.shipping_address || {},
        payment_method: body.payment_method || null,
        status: "pending",
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      const orderItems = ensureArray(cartItems).map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_ngn: priceMap.get(item.product_id) || 0,
      }));
      if (orderItems.length) {
        await service.from("order_items").insert(orderItems);
      }
      await service.from("cart_items").delete().eq("user_id", user.id);
      return json(order);
    }

    if (route === "/diagnoses" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data: diagnoses, error } = await service.from("diagnoses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const scanIds = ensureArray(diagnoses).map((diagnosis) => diagnosis.scan_id);
      const { data: scans } = await service.from("scans").select("id, image_url, scan_type").in("id", scanIds.length ? scanIds : ["00000000-0000-0000-0000-000000000000"]);
      const scanMap = new Map(ensureArray(scans).map((scan) => [scan.id, scan]));
      return json(ensureArray(diagnoses).map((diagnosis) => ({
        ...diagnosis,
        image_url: scanMap.get(diagnosis.scan_id)?.image_url || null,
        scan_type: scanMap.get(diagnosis.scan_id)?.scan_type || null,
      })));
    }

    if (route === "/treatment-plans" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("treatment_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "/community/posts" && req.method === "GET") {
      const optionalUser = await getUserFromRequest(req, service);
      const communityType = normalizeCommunityType(url.searchParams.get("community"));
      const limitParam = Number(url.searchParams.get("limit") || 50);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 100) : 50;

      const { data: posts, error: postsError } = await service
        .from("community_posts")
        .select("id, user_id, community_type, author_name, author_role, content, image_url, created_at")
        .eq("community_type", communityType)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (postsError) return json({ error: postsError.message }, 500);

      const postRows = ensureArray(posts);
      const postIds = postRows.map((post) => post.id);
      if (!postIds.length) return json({ posts: [] });

      const { data: comments, error: commentsError } = await service
        .from("community_comments")
        .select("id, post_id, parent_comment_id, user_id, author_name, content, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });
      if (commentsError) return json({ error: commentsError.message }, 500);

      const commentRows = ensureArray(comments);
      const commentIds = commentRows.map((comment) => comment.id);

      const { data: postReactions, error: postReactionError } = await service
        .from("community_reactions")
        .select("id, post_id, user_id, reaction")
        .in("post_id", postIds)
        .is("comment_id", null);
      if (postReactionError) return json({ error: postReactionError.message }, 500);

      const commentReactions = commentIds.length
        ? await service
          .from("community_reactions")
          .select("id, comment_id, user_id, reaction")
          .in("comment_id", commentIds)
          .is("post_id", null)
        : { data: [], error: null };
      if (commentReactions.error) return json({ error: commentReactions.error.message }, 500);

      const postReactionByTarget = new Map<string, { likes: number; loves: number; userReaction: string | null }>();
      for (const reaction of ensureArray(postReactions.data)) {
        const target = reaction.post_id as string;
        const current = postReactionByTarget.get(target) || { likes: 0, loves: 0, userReaction: null };
        if (reaction.reaction === "like") current.likes += 1;
        if (reaction.reaction === "love") current.loves += 1;
        if (optionalUser?.id && reaction.user_id === optionalUser.id) current.userReaction = reaction.reaction;
        postReactionByTarget.set(target, current);
      }

      const commentReactionByTarget = new Map<string, { likes: number; loves: number; userReaction: string | null }>();
      for (const reaction of ensureArray(commentReactions.data)) {
        const target = reaction.comment_id as string;
        const current = commentReactionByTarget.get(target) || { likes: 0, loves: 0, userReaction: null };
        if (reaction.reaction === "like") current.likes += 1;
        if (reaction.reaction === "love") current.loves += 1;
        if (optionalUser?.id && reaction.user_id === optionalUser.id) current.userReaction = reaction.reaction;
        commentReactionByTarget.set(target, current);
      }

      const topLevelCommentsByPost = new Map<string, Array<Record<string, unknown>>>();
      const repliesByParent = new Map<string, Array<Record<string, unknown>>>();

      for (const comment of commentRows) {
        const stats = commentReactionByTarget.get(comment.id) || { likes: 0, loves: 0, userReaction: null };
        const normalized = {
          id: comment.id,
          author: comment.author_name,
          content: comment.content,
          createdAt: comment.created_at,
          likes: stats.likes,
          loves: stats.loves,
          userReaction: stats.userReaction,
          replies: [] as Array<Record<string, unknown>>,
        };

        if (comment.parent_comment_id) {
          const currentReplies = repliesByParent.get(comment.parent_comment_id) || [];
          currentReplies.push(normalized);
          repliesByParent.set(comment.parent_comment_id, currentReplies);
        } else {
          const currentComments = topLevelCommentsByPost.get(comment.post_id) || [];
          currentComments.push(normalized);
          topLevelCommentsByPost.set(comment.post_id, currentComments);
        }
      }

      for (const commentsForPost of topLevelCommentsByPost.values()) {
        for (const comment of commentsForPost) {
          const replies = repliesByParent.get(String(comment.id)) || [];
          comment.replies = replies;
        }
      }

      const responsePosts = postRows.map((post) => {
        const stats = postReactionByTarget.get(post.id) || { likes: 0, loves: 0, userReaction: null };
        return {
          id: post.id,
          community: post.community_type,
          author: post.author_name,
          authorRole: post.author_role,
          content: post.content,
          imageUrl: post.image_url || null,
          createdAt: post.created_at,
          likes: stats.likes,
          loves: stats.loves,
          userReaction: stats.userReaction,
          comments: topLevelCommentsByPost.get(post.id) || [],
        };
      });

      return json({ posts: responsePosts });
    }

    if (route === "/community/posts" && req.method === "POST") {
      const user = await requireUser(req, service);
      const communityType = normalizeCommunityType(body.communityType);
      const content = typeof body.content === "string" ? body.content.trim() : "";
      const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      const authorNameInput = typeof body.authorName === "string" ? body.authorName.trim() : "";
      if (!content && !imageUrl) return json({ error: "Add text or an image to create a post" }, 400);
      if (content.length > 2000) return json({ error: "Post is too long (max 2000 characters)" }, 400);

      const authorName = authorNameInput || defaultCommunityAuthor(user);
      const authorRole = communityType === "hair" ? "Hair Journey Member" : "Skin Journey Member";

      const { data, error } = await service
        .from("community_posts")
        .insert({
          user_id: user.id,
          community_type: communityType,
          author_name: authorName,
          author_role: authorRole,
          content,
          image_url: imageUrl || null,
        })
        .select("id")
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ success: true, id: data.id });
    }

    if (route === "/community/upload-image" && req.method === "POST") {
      const user = await requireUser(req, service);
      const communityType = normalizeCommunityType(body.communityType);
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
      const base64 = typeof body.base64 === "string" ? body.base64.trim() : "";
      const contentType = typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "image/jpeg";
      const bucketId = "community-media";

      if (!base64) return json({ error: "Image payload is required" }, 400);
      if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
        return json({ error: "Only JPG, PNG, WEBP, and GIF images are allowed" }, 400);
      }

      let bytes: Uint8Array;
      try {
        bytes = decodeBase64Payload(base64);
      } catch {
        return json({ error: "Invalid image payload" }, 400);
      }
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return json({ error: "Image is too large. Maximum size is 10MB." }, 400);
      }

      const { data: buckets, error: bucketsError } = await service.storage.listBuckets();
      if (bucketsError) return json({ error: bucketsError.message }, 500);
      const exists = ensureArray(buckets).some((bucket) => bucket.id === bucketId);
      if (!exists) {
        const created = await service.storage.createBucket(bucketId, { public: true });
        if (created.error) return json({ error: created.error.message }, 500);
      }

      const extension = normalizeCommunityImageExtension(contentType, fileName);
      const path = `${communityType}/${user.id}/${Date.now()}-${crypto.randomUUID()}${extension}`;
      const upload = await service.storage
        .from(bucketId)
        .upload(path, bytes, { contentType, upsert: false });
      if (upload.error) return json({ error: upload.error.message }, 500);

      const { data: publicData } = service.storage.from(bucketId).getPublicUrl(path);
      return json({
        success: true,
        path,
        publicUrl: publicData.publicUrl,
        contentType,
      });
    }

    if (route === "/community/comments" && req.method === "POST") {
      const user = await requireUser(req, service);
      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      const parentCommentId = typeof body.parentCommentId === "string" ? body.parentCommentId.trim() : null;
      const content = typeof body.content === "string" ? body.content.trim() : "";
      const authorNameInput = typeof body.authorName === "string" ? body.authorName.trim() : "";

      if (!postId || !content) return json({ error: "postId and content are required" }, 400);
      if (content.length > 1000) return json({ error: "Comment is too long (max 1000 characters)" }, 400);

      const { data: post } = await service.from("community_posts").select("id").eq("id", postId).maybeSingle();
      if (!post) return json({ error: "Post not found" }, 404);

      if (parentCommentId) {
        const { data: parent } = await service
          .from("community_comments")
          .select("id, post_id, parent_comment_id")
          .eq("id", parentCommentId)
          .maybeSingle();
        if (!parent || parent.post_id !== postId) return json({ error: "Invalid parent comment" }, 400);
        if (parent.parent_comment_id) return json({ error: "Replies can only be made to top-level comments" }, 400);
      }

      const authorName = authorNameInput || defaultCommunityAuthor(user);
      const { data, error } = await service
        .from("community_comments")
        .insert({
          post_id: postId,
          parent_comment_id: parentCommentId,
          user_id: user.id,
          author_name: authorName,
          content,
        })
        .select("id")
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ success: true, id: data.id });
    }

    if (route === "/community/reactions" && req.method === "POST") {
      const user = await requireUser(req, service);
      const postId = typeof body.postId === "string" ? body.postId.trim() : "";
      const commentId = typeof body.commentId === "string" ? body.commentId.trim() : "";
      const reaction = normalizeCommunityReaction(body.reaction);

      if (!reaction) return json({ error: "reaction must be like or love" }, 400);
      if ((postId && commentId) || (!postId && !commentId)) {
        return json({ error: "Provide either postId or commentId" }, 400);
      }

      const existingQuery = service
        .from("community_reactions")
        .select("id, reaction")
        .eq("user_id", user.id);
      const existing = postId
        ? await existingQuery.eq("post_id", postId).is("comment_id", null).maybeSingle()
        : await existingQuery.eq("comment_id", commentId).is("post_id", null).maybeSingle();
      if (existing.error) return json({ error: existing.error.message }, 500);

      if (existing.data?.id) {
        if (existing.data.reaction === reaction) {
          const { error } = await service.from("community_reactions").delete().eq("id", existing.data.id);
          if (error) return json({ error: error.message }, 500);
          return json({ success: true, state: "removed" });
        }

        const { error } = await service
          .from("community_reactions")
          .update({ reaction })
          .eq("id", existing.data.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, state: "updated" });
      }

      const insertPayload = postId
        ? { user_id: user.id, post_id: postId, comment_id: null, reaction }
        : { user_id: user.id, post_id: null, comment_id: commentId, reaction };
      const { error } = await service.from("community_reactions").insert(insertPayload);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, state: "added" });
    }

    if (route === "/salon/services" && req.method === "GET") {
      return json(SALON_SERVICES);
    }

    if (route === "/salon/available-slots" && req.method === "GET") {
      const date = url.searchParams.get("date");
      if (!date) return json({ error: "Date is required" }, 400);
      const { data: bookings, error } = await service
        .from("salon_appointments")
        .select("time_slot, duration_minutes")
        .eq("appointment_date", date)
        .not("status", "in", "(cancelled,no-show)");
      if (error) return json({ error: error.message }, 500);
      const blockedSlots = new Set<string>();
      for (const booking of ensureArray(bookings)) {
        const startIndex = TIME_SLOTS.indexOf(booking.time_slot);
        if (startIndex >= 0) {
          const slotsNeeded = Math.ceil(Number(booking.duration_minutes || 30) / 30);
          for (let index = 0; index < slotsNeeded; index += 1) {
            if (TIME_SLOTS[startIndex + index]) blockedSlots.add(TIME_SLOTS[startIndex + index]);
          }
        }
      }
      return json({
        date,
        availableSlots: TIME_SLOTS.filter((slot) => !blockedSlots.has(slot)),
        bookedSlots: Array.from(blockedSlots),
        totalSlots: TIME_SLOTS.length,
      });
    }

    if (route === "/salon/booked-dates" && req.method === "GET") {
      const month = Number(url.searchParams.get("month"));
      const year = Number(url.searchParams.get("year"));
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      const { data: bookings, error } = await service
        .from("salon_appointments")
        .select("appointment_date, status")
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .not("status", "in", "(cancelled,no-show)");
      if (error) return json({ error: error.message }, 500);
      const grouped: Record<string, { count: number; status: string }> = {};
      for (const booking of ensureArray(bookings).filter((item) => !["cancelled", "no-show"].includes(String(item.status)))) {
        const key = String(booking.appointment_date);
        const current = grouped[key] || { count: 0, status: "available" };
        current.count += 1;
        current.status = current.count >= TIME_SLOTS.length * 0.8 ? "full" : current.count >= TIME_SLOTS.length * 0.5 ? "limited" : "available";
        grouped[key] = current;
      }
      return json(grouped);
    }

    if (route === "/salon/book" && req.method === "POST") {
      const optionalUser = await getUserFromRequest(req, service);
      const normalizedServiceIds = Array.from(new Set(Array.isArray(body.serviceIds)
        ? ensureArray(body.serviceIds).filter((id) => typeof id === "string" && id.trim().length > 0)
        : (typeof body.serviceId === "string" && body.serviceId.trim() ? [body.serviceId] : [])));
      if (!body.customerName || !body.customerPhone || !normalizedServiceIds.length || !body.appointmentDate || !body.timeSlot) {
        return json({ error: "Missing required fields" }, 400);
      }
      const selectedServices = normalizedServiceIds
        .map((id) => SALON_SERVICES.find((item) => item.id === id))
        .filter(Boolean) as typeof SALON_SERVICES;
      if (selectedServices.length !== normalizedServiceIds.length) return json({ error: "Invalid service" }, 400);
      const totalDuration = selectedServices.reduce((sum, item) => sum + Number(item.duration || 0), 0);
      const totalPrice = selectedServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
      const serviceName = selectedServices.map((item) => item.name).join(", ");
      const serviceType = Array.from(new Set(selectedServices.map((item) => item.category))).join(", ");
      const transactionRef = typeof body.transactionRef === "string" ? body.transactionRef.trim() : "";
      if (!transactionRef) return json({ error: "Payment is required to confirm this booking" }, 400);
      const { data: transaction, error: transactionError } = await service
        .from("payment_transactions")
        .select("transaction_ref, status, amount, customer_email, customer_phone, customer_name, user_id, payment_ref")
        .eq("transaction_ref", transactionRef)
        .eq("payment_type", "salon_booking")
        .maybeSingle();
      if (transactionError) return json({ error: transactionError.message }, 500);
      if (!transaction || String(transaction.status || "").toLowerCase() !== "successful") {
        return json({ error: "Payment has not been verified" }, 400);
      }
      if (Number(transaction.amount || 0) !== SALON_DEPOSIT_NGN) {
        return json({ error: "Invalid payment amount for booking deposit" }, 400);
      }
      if (optionalUser?.id && transaction.user_id && transaction.user_id !== optionalUser.id) {
        return json({ error: "Payment does not match the logged in user" }, 400);
      }
      const normalizedCustomerPhone = normalizePhoneNumber(body.customerPhone);
      const normalizedTransactionPhone = normalizePhoneNumber(transaction.customer_phone);
      if (normalizedTransactionPhone && normalizedCustomerPhone && normalizedTransactionPhone !== normalizedCustomerPhone) {
        return json({ error: "Payment does not match the booking phone number" }, 400);
      }
      if (transaction.customer_email && body.customerEmail && String(transaction.customer_email).toLowerCase() !== String(body.customerEmail).toLowerCase()) {
        return json({ error: "Payment does not match the booking email" }, 400);
      }

      const { data: existing } = await service
        .from("salon_appointments")
        .select("id")
        .eq("appointment_date", body.appointmentDate)
        .eq("time_slot", body.timeSlot)
        .not("status", "in", "(cancelled,no-show)")
        .limit(1);
      if (ensureArray(existing).length) return json({ error: "This time slot is no longer available" }, 409);
      const { data, error } = await service.from("salon_appointments").insert({
        customer_name: body.customerName,
        customer_email: body.customerEmail || null,
        customer_phone: body.customerPhone,
        user_id: optionalUser?.id || null,
        service_type: serviceType,
        service_name: serviceName,
        appointment_date: body.appointmentDate,
        time_slot: body.timeSlot,
        duration_minutes: totalDuration,
        price_ngn: totalPrice,
        notes: body.notes || null,
        is_registered_user: Boolean(optionalUser),
        status: "confirmed",
        payment_status: "paid",
        payment_ref: transaction.payment_ref || transaction.transaction_ref,
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, booking: data, message: "Appointment booked successfully!" });
    }

    if (route === "/salon/my-appointments" && req.method === "GET") {
      const user = await requireUser(req, service);
      const { data, error } = await service.from("salon_appointments").select("*").eq("user_id", user.id).order("appointment_date", { ascending: false }).order("time_slot", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route.startsWith("/salon/cancel/") && req.method === "POST") {
      const optionalUser = await getUserFromRequest(req, service);
      let targetId = Number(segments[2]);
      if (!optionalUser) {
        const phone = normalizePhoneNumber(body.customerPhone);
        if (!phone) return json({ error: "customerPhone is required for guest cancellation" }, 400);
        const { data: bookings } = await service.from("salon_appointments").select("*").eq("id", targetId);
        const target = ensureArray(bookings).find((booking) => normalizePhoneNumber(booking.customer_phone) === phone);
        if (!target) return json({ error: "Appointment not found or already cancelled" }, 404);
        targetId = target.id;
      }
      const query = service.from("salon_appointments").update({ status: "cancelled" }).eq("id", targetId);
      const { data, error } = optionalUser
        ? await query.eq("user_id", optionalUser.id).select().maybeSingle()
        : await query.select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "Appointment not found or already cancelled" }, 404);
      return json({ success: true, appointment: data });
    }

    if (route === "/salon/priority-slots" && req.method === "GET") {
      await requireUser(req, service);
      const date = url.searchParams.get("date");
      if (!date) return json({ error: "date is required" }, 400);
      const { data: bookings } = await service
        .from("salon_appointments")
        .select("time_slot, duration_minutes")
        .eq("appointment_date", date)
        .not("status", "in", "(cancelled,no-show)");
      const blockedSlots = new Set<string>();
      for (const booking of ensureArray(bookings)) {
        const startIndex = TIME_SLOTS.indexOf(booking.time_slot);
        if (startIndex >= 0) {
          const slotsNeeded = Math.ceil(Number(booking.duration_minutes || 30) / 30);
          for (let index = 0; index < slotsNeeded; index += 1) {
            if (TIME_SLOTS[startIndex + index]) blockedSlots.add(TIME_SLOTS[startIndex + index]);
          }
        }
      }
      const availableSlots = TIME_SLOTS.filter((slot) => !blockedSlots.has(slot));
      return json({
        prioritySlots: availableSlots.slice(0, 6),
        regularSlots: availableSlots.slice(6),
        allAvailable: availableSlots,
        isRegisteredUser: true,
      });
    }

    if (route === "/payment/initialize" && req.method === "POST") {
      const optionalUser = await getUserFromRequest(req, service);
      if (!body.customerEmail || !body.customerName || !body.customerPhone) {
        return json({ error: "Missing required payment details" }, 400);
      }

      const paymentType = normalizePaymentType(body.paymentType || (body.bookingId ? "salon_booking" : "general"));
      let amount = Number(body.amount);
      let resolvedPlanId: string | null = null;
      let description = typeof body.description === "string" ? body.description : "";
      const scanId = typeof body.scanId === "string"
        ? body.scanId.trim()
        : typeof body.metadata?.scanId === "string"
          ? String(body.metadata.scanId).trim()
          : "";

      if (paymentType === "subscription") {
        if (!optionalUser?.id) return json({ error: "Authentication is required for subscription payments" }, 401);
        const plan = body.planId
          ? (await service.from("subscription_plans").select("id, name, price_ngn, is_active").eq("id", body.planId).maybeSingle()).data
          : await getOrCreateMonthlyScanPlan(service);
        if (!plan || !plan.is_active) return json({ error: "Invalid or inactive subscription plan" }, 400);
        amount = Number(plan.price_ngn);
        resolvedPlanId = plan.id;
        if (!description) description = `Subscription: ${plan.name}`;
      }

      if (paymentType === "salon_booking") {
        amount = SALON_DEPOSIT_NGN;
        if (!description) description = "Salon booking deposit";
      }

      if (paymentType === "analysis") {
        if (!scanId) return json({ error: "scanId is required for analysis payments" }, 400);
        if (scanId) {
          const { data: scan } = await service.from("scans").select("id, user_id").eq("id", scanId).maybeSingle();
          if (!scan) return json({ error: "Invalid scan for analysis payment" }, 400);
          if (optionalUser?.id && scan.user_id !== optionalUser.id) return json({ error: "Invalid scan for analysis payment" }, 400);
        }
        if (!description) description = "Analysis results unlock";
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: "Amount must be greater than zero" }, 400);
      }

      const transactionRef = generateTransactionRef();
      // redirectPath can be a full URL (from frontend) or a path
      let redirectUrl: string;
      if (typeof body.redirectPath === "string" && (body.redirectPath.startsWith("http://") || body.redirectPath.startsWith("https://"))) {
        redirectUrl = body.redirectPath;
      } else {
        const redirectPath = typeof body.redirectPath === "string" && body.redirectPath.startsWith("/")
          ? body.redirectPath
          : "/payment/callback";
        redirectUrl = `${getApiBaseUrl()}${redirectPath}`;
      }
      const payment = await buildQuicktellerPayment({
        amount,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        transactionRef,
        redirectUrl,
        description,
      });

      const metadata = {
        ...normalizeMetadata(body.metadata),
        ...(scanId ? { scanId } : {}),
      };

      await service.from("payment_transactions").insert({
        transaction_ref: transactionRef,
        payment_type: paymentType,
        amount,
        customer_email: body.customerEmail,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        booking_id: body.bookingId || null,
        plan_id: resolvedPlanId,
        metadata: {
          ...metadata,
          description,
          initializedAt: new Date().toISOString(),
        },
        status: "pending",
        user_id: optionalUser?.id || null,
      });

      return json({
        success: true,
        transactionRef,
        paymentType,
        amount,
        paymentUrl: payment.paymentUrl,
        scriptUrl: payment.scriptUrl,
        inlineConfig: payment.inlineConfig,
        config: {
          merchantCode: payment.inlineConfig.merchant_code,
          payItemId: payment.inlineConfig.pay_item_id,
          payItemName: payment.inlineConfig.pay_item_name,
          transactionReference: payment.inlineConfig.txn_ref,
          amount: payment.inlineConfig.amount,
          currency: Number(payment.inlineConfig.currency),
          customerName: payment.inlineConfig.cust_name,
          customerEmail: payment.inlineConfig.cust_email,
          customerMobile: payment.inlineConfig.cust_mobile_no,
          redirectUrl: payment.inlineConfig.site_redirect_url,
          mode: payment.inlineConfig.mode,
        },
        context: {
          bookingId: body.bookingId || null,
          planId: resolvedPlanId,
        },
      });
    }

    if (route === "/payment/callback" && (req.method === "GET" || req.method === "POST")) {
      const payload = req.method === "POST" ? Object.fromEntries((await req.formData()).entries()) : Object.fromEntries(url.searchParams.entries());
      const params = new URLSearchParams();
      const txnref = payload.txnref || payload.transactionreference || payload.transactionRef;
      if (txnref) params.set("txnref", String(txnref));
      if (payload.amount) params.set("amount", String(payload.amount));
      if (payload.resp) params.set("resp", String(payload.resp));
      if (payload.desc) params.set("desc", String(payload.desc));
      if (payload.retRef) params.set("retRef", String(payload.retRef));
      if (payload.payRef) params.set("payRef", String(payload.payRef));
      return redirect(`${getPublicBaseUrl(req)}/payment-callback${params.toString() ? `?${params.toString()}` : ""}`);
    }

    if (route.startsWith("/payment/verify/") && req.method === "GET") {
      const transactionRef = segments[2];
      const { data: transaction } = await service.from("payment_transactions").select("*").eq("transaction_ref", transactionRef).maybeSingle();
      if (!transaction) return json({ success: false, status: "failed", error: "Transaction not found" }, 404);
      const result = await verifyQuicktellerPayment(transactionRef, Number(transaction.amount || 0));
      await service.from("payment_transactions").update({
        status: result.status,
        verified_at: new Date().toISOString(),
        payment_ref: result.paymentRef || null,
        response_code: result.responseCode || null,
        verified_response: result.raw || {},
      }).eq("transaction_ref", transactionRef);

      const actions: Record<string, unknown> = {};
      if (result.status === "successful") {
        if (transaction.payment_type === "salon_booking" && transaction.booking_id) {
          await service.from("salon_appointments").update({
            payment_status: "paid",
            payment_ref: result.paymentRef || transactionRef,
            status: "confirmed",
          }).eq("id", transaction.booking_id);
          actions.salonBookingUpdated = true;
        }

        if (transaction.payment_type === "analysis") {
          actions.analysisUnlocked = true;
        }

        if (transaction.payment_type === "subscription" && transaction.plan_id && transaction.user_id) {
          await service.from("subscriptions").update({ status: "cancelled" }).eq("user_id", transaction.user_id).eq("status", "active");
          await service.from("subscriptions").insert({
            user_id: transaction.user_id,
            plan_id: transaction.plan_id,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
            scans_used_this_period: 0,
          });
          actions.subscriptionActivated = true;
        }
      }
      return json({ ...result, transactionRef, paymentType: transaction.payment_type, actions });
    }

    if (route.startsWith("/payment/status/") && req.method === "GET") {
      const { data, error } = await service.from("payment_transactions").select("*").eq("transaction_ref", segments[2]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Transaction not found" }, 404);
      return json(data);
    }

    if (route === "/analysis/payment-status" && req.method === "GET") {
      const user = await requireUser(req, service);
      const scanId = url.searchParams.get("scanId")?.trim();
      if (!scanId) return json({ error: "scanId is required" }, 400);
      const { data, error } = await service
        .from("payment_transactions")
        .select("status, amount, transaction_ref, created_at")
        .eq("payment_type", "analysis")
        .eq("user_id", user.id)
        .contains("metadata", { scanId })
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return json({ error: error.message }, 500);
      const transaction = Array.isArray(data) && data.length ? data[0] : null;
      const paid = Boolean(transaction && ["successful", "paid"].includes(String(transaction.status || "").toLowerCase()));
      return json({
        paid,
        status: transaction?.status || "unpaid",
        amount: transaction?.amount || 0,
        transactionRef: transaction?.transaction_ref || null,
      });
    }

    if (route === "/subscriptions/consume-scan" && req.method === "POST") {
      const user = await requireUser(req, service);
      const { data: subscriptions } = await service
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      const subscription = ensureArray(subscriptions)[0];
      if (!subscription) return json({ error: "No active subscription found" }, 403);

      const { data: plan } = await service
        .from("subscription_plans")
        .select("max_scans_per_month")
        .eq("id", subscription.plan_id)
        .maybeSingle();
      const maxScans = plan?.max_scans_per_month ?? null;
      const scansUsed = Number(subscription.scans_used_this_period || 0);

      if (maxScans !== null && scansUsed >= maxScans) {
        return json({
          error: "Scan limit reached",
          scansUsed,
          maxScans,
        }, 403);
      }

      const { error } = await service
        .from("subscriptions")
        .update({ scans_used_this_period: scansUsed + 1 })
        .eq("id", subscription.id);
      if (error) return json({ error: error.message }, 500);

      return json({
        success: true,
        scansUsed: scansUsed + 1,
        maxScans,
        scansRemaining: maxScans === null ? null : Math.max(0, maxScans - (scansUsed + 1)),
      });
    }

    if (route === "/storage/ensure-buckets" && req.method === "POST") {
      await requireUser(req, service);
      const { data: buckets, error } = await service.storage.listBuckets();
      if (error) return json({ error: error.message }, 500);
      const existing = new Set((buckets || []).map((bucket) => bucket.id));
      const required = ["skin-scans", "hair-scans"];
      for (const bucketId of required) {
        if (!existing.has(bucketId)) {
          const create = await service.storage.createBucket(bucketId, { public: false });
          if (create.error) return json({ error: create.error.message }, 500);
        }
      }
      return json({ success: true, buckets: required });
    }

    if (route === "/storage/upload-scan" && req.method === "POST") {
      const optionalUser = await getUserFromRequest(req, service);
      const bucket = typeof body.bucket === "string" ? body.bucket.trim() : "";
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
      const base64 = typeof body.base64 === "string" ? body.base64.trim() : "";
      const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "image/jpeg";

      if (!["skin-scans", "hair-scans"].includes(bucket)) {
        return json({ error: "Invalid storage bucket" }, 400);
      }
      if (!fileName || !base64) {
        return json({ error: "fileName and base64 are required" }, 400);
      }

      const ownerPrefix = fileName.split("/")[0];
      if (optionalUser?.id && ownerPrefix && ownerPrefix !== optionalUser.id) {
        return json({ error: "Invalid file path for current user" }, 403);
      }

      let bytes: Uint8Array;
      try {
        bytes = decodeBase64Payload(base64);
      } catch {
        return json({ error: "Invalid base64 payload" }, 400);
      }

      const { error: uploadError } = await service.storage
        .from(bucket)
        .upload(fileName, bytes, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return json({ error: uploadError.message }, 500);
      }

      const { data: publicData } = service.storage.from(bucket).getPublicUrl(fileName);
      return json({
        success: true,
        path: fileName,
        publicUrl: publicData.publicUrl,
      });
    }

    if (route === "/checkout/send-details" && req.method === "POST") {
      const user = await requireUser(req, service);
      return json(await sendCheckoutDetails(req, user, body as Record<string, unknown>));
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Edge API error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
