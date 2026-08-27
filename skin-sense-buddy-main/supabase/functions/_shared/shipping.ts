import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

type ShippingAddress = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  specialInstructions?: string;
};

type CartProduct = {
  id: string;
  name: string;
  description: string | null;
  price_ngn: number;
  shipping_weight_grams: number;
  shipping_length_cm: number;
  shipping_width_cm: number;
  shipping_height_cm: number;
  customs_description: string | null;
  hs_code: string | null;
  country_of_origin: string | null;
};

type CartLine = {
  product_id: string;
  quantity: number;
  product: CartProduct;
};

type ShippingQuoteRow = JsonRecord & {
  id: string;
  user_id: string;
  cart_signature: string;
  destination_signature: string;
  customer_amount_ngn: number;
  expires_at: string;
};

export class ShippingError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "shipping_error") {
    super(message);
    this.name = "ShippingError";
    this.status = status;
    this.code = code;
  }
}

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function requiredEnv(name: string) {
  const value = env(name);
  if (!value) throw new ShippingError(`Shipping is not configured: ${name} is required.`, 503, "shipping_not_configured");
  return value;
}

function positiveNumber(value: unknown, field: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ShippingError(`Product shipping field ${field} must be a positive number.`, 422, "invalid_parcel_data");
  }
  return numeric;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown) {
  return normalizeText(value).replace(/(?!^)[^0-9]/g, "");
}

function stableAddress(address: ShippingAddress) {
  return {
    name: address.name,
    email: address.email.toLowerCase(),
    phone: normalizePhone(address.phone),
    address: address.address,
    city: address.city,
    state: address.state,
    country: address.country,
    zipCode: address.zipCode,
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseShippingAddress(value: unknown): ShippingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ShippingError("A complete shipping address is required.", 422, "invalid_shipping_address");
  }
  const input = value as JsonRecord;
  const address: ShippingAddress = {
    name: normalizeText(input.name || input.fullName),
    email: normalizeText(input.email).toLowerCase(),
    phone: normalizeText(input.phone),
    address: normalizeText(input.address || input.deliveryAddress),
    city: normalizeText(input.city),
    state: normalizeText(input.state),
    country: normalizeText(input.country),
    zipCode: normalizeText(input.zipCode || input.zip || input.postalCode),
    specialInstructions: normalizeText(input.specialInstructions || input.special_instructions),
  };
  const missing = ["name", "email", "phone", "address", "city", "state", "country", "zipCode"].filter((key) => !address[key as keyof ShippingAddress]);
  if (missing.length) throw new ShippingError(`Shipping address is incomplete: ${missing.join(", ")}.`, 422, "invalid_shipping_address");
  if (!/^[\p{L}]+(?:\s+[\p{L}]+)+$/u.test(address.name)) {
    throw new ShippingError("Enter your first and last name using letters and spaces only.", 422, "invalid_shipping_address");
  }
  if (!/^\S+@\S+\.\S+$/.test(address.email)) throw new ShippingError("A valid shipping email is required.", 422, "invalid_shipping_address");
  if (normalizePhone(address.phone).length < 7) throw new ShippingError("A valid shipping phone number is required.", 422, "invalid_shipping_address");
  return address;
}

function parseJsonResponse(payload: unknown): JsonRecord {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as JsonRecord : {};
}

function safeProviderMessage(payload: JsonRecord, fallback: string) {
  const candidates = [payload.message, payload.error, payload.detail];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().slice(0, 240);
    }
  }
  return fallback;
}

async function shipbubbleRequest(path: string, body: JsonRecord) {
  const apiKey = requiredEnv("SHIPBUBBLE_API_KEY");
  const response = await fetch(`https://api.shipbubble.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = parseJsonResponse(await response.json().catch(() => ({})));
  if (!response.ok) {
    const providerMessage = safeProviderMessage(payload, `HTTP ${response.status}`);
    console.error(`[Shipbubble] ${path} failed with HTTP ${response.status}: ${providerMessage}`);
    throw new ShippingError(`Shipping provider request failed (${response.status}). ${providerMessage}`, 502, "shipping_provider_error");
  }
  if (String(payload.status || "").toLowerCase() === "error") {
    const providerMessage = safeProviderMessage(payload, "The provider returned an error response.");
    console.error(`[Shipbubble] ${path} returned an error: ${providerMessage}`);
    throw new ShippingError(`Shipping provider rejected the request. ${providerMessage}`, 502, "shipping_provider_error");
  }
  return payload;
}

function normalizeCurrency(value: unknown) {
  const raw = String(value || "").trim();
  if (raw === "₦" || raw.toUpperCase() === "NGN") return "NGN";
  return raw.toUpperCase();
}

async function getCartLines(service: SupabaseClient, userId: string): Promise<CartLine[]> {
  const { data: cartItems, error: cartError } = await service
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", userId);
  if (cartError) throw new ShippingError("Unable to load the cart for shipping calculation.", 500, "cart_error");
  if (!Array.isArray(cartItems) || cartItems.length === 0) throw new ShippingError("Cart is empty.", 400, "empty_cart");

  const productIds = cartItems.map((item) => String(item.product_id));
  const { data: products, error: productError } = await service
    .from("products")
    .select("id, name, description, price_ngn, shipping_weight_grams, shipping_length_cm, shipping_width_cm, shipping_height_cm, customs_description, hs_code, country_of_origin")
    .in("id", productIds);
  if (productError) throw new ShippingError("Unable to load product shipping data.", 500, "product_error");

  const productMap = new Map((products || []).map((product) => [String(product.id), product]));
  return cartItems.map((item) => {
    const product = productMap.get(String(item.product_id));
    if (!product) throw new ShippingError("A product in the cart is no longer available.", 409, "cart_changed");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new ShippingError("Cart quantity is invalid.", 422, "invalid_cart");
    const normalized: CartProduct = {
      id: String(product.id),
      name: normalizeText(product.name) || "IMSTEV NATURALS product",
      description: normalizeText(product.description) || null,
      price_ngn: positiveNumber(product.price_ngn, "price_ngn"),
      shipping_weight_grams: positiveNumber(product.shipping_weight_grams, "shipping_weight_grams"),
      shipping_length_cm: positiveNumber(product.shipping_length_cm, "shipping_length_cm"),
      shipping_width_cm: positiveNumber(product.shipping_width_cm, "shipping_width_cm"),
      shipping_height_cm: positiveNumber(product.shipping_height_cm, "shipping_height_cm"),
      customs_description: normalizeText(product.customs_description) || null,
      hs_code: normalizeText(product.hs_code) || null,
      country_of_origin: normalizeText(product.country_of_origin) || null,
    };
    return { product_id: normalized.id, quantity, product: normalized };
  });
}

function buildCartSnapshot(lines: CartLine[]) {
  return lines
    .map((line) => ({
      product_id: line.product_id,
      quantity: line.quantity,
      name: line.product.name,
      price_ngn: line.product.price_ngn,
      weight_grams: line.product.shipping_weight_grams,
      length_cm: line.product.shipping_length_cm,
      width_cm: line.product.shipping_width_cm,
      height_cm: line.product.shipping_height_cm,
      customs_description: line.product.customs_description,
      hs_code: line.product.hs_code,
      country_of_origin: line.product.country_of_origin,
    }))
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

function buildParcel(lines: CartLine[]) {
  const snapshot = buildCartSnapshot(lines);
  const weightGrams = snapshot.reduce((sum, line) => sum + line.weight_grams * line.quantity, 0);
  const lengthCm = Math.max(...snapshot.map((line) => line.length_cm));
  const widthCm = Math.max(...snapshot.map((line) => line.width_cm));
  const heightCm = snapshot.reduce((sum, line) => sum + line.height_cm * line.quantity, 0);
  return {
    snapshot,
    weightGrams: Number(weightGrams.toFixed(2)),
    weightKg: Number((weightGrams / 1000).toFixed(3)),
    dimensions: {
      length: Number(lengthCm.toFixed(2)),
      width: Number(widthCm.toFixed(2)),
      height: Number(heightCm.toFixed(2)),
    },
  };
}

export async function getCartShippingContext(service: SupabaseClient, userId: string) {
  const lines = await getCartLines(service, userId);
  const parcel = buildParcel(lines);
  const cartSnapshot = parcel.snapshot;
  const cartSignature = await sha256(JSON.stringify(cartSnapshot));
  const merchandiseSubtotalNgn = lines.reduce((sum, line) => sum + line.product.price_ngn * line.quantity, 0);
  return { lines, parcel, cartSnapshot, cartSignature, merchandiseSubtotalNgn };
}

export async function createShippingQuote(service: SupabaseClient, userId: string, rawAddress: unknown) {
  const address = parseShippingAddress(rawAddress);
  const context = await getCartShippingContext(service, userId);
  const destinationSignature = await sha256(JSON.stringify(stableAddress(address)));
  const senderAddressCode = Number(requiredEnv("SHIPBUBBLE_SENDER_ADDRESS_CODE"));
  const categoryId = Number(requiredEnv("SHIPBUBBLE_CATEGORY_ID"));
  if (!Number.isInteger(senderAddressCode) || senderAddressCode <= 0) throw new ShippingError("SHIPBUBBLE_SENDER_ADDRESS_CODE must be a valid address code.", 503, "shipping_not_configured");
  if (!Number.isInteger(categoryId) || categoryId <= 0) throw new ShippingError("SHIPBUBBLE_CATEGORY_ID must be a valid package category ID.", 503, "shipping_not_configured");

  const destinationString = [address.address, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(", ");
  const addressPayload = await shipbubbleRequest("/shipping/address/validate", {
    name: address.name,
    email: address.email,
    phone: address.phone,
    address: destinationString,
  });
  const validatedAddress = parseJsonResponse(addressPayload.data);
  const receiverAddressCode = Number(validatedAddress.address_code);
  if (!Number.isInteger(receiverAddressCode) || receiverAddressCode <= 0) {
    throw new ShippingError("The delivery address could not be verified by the shipping provider.", 422, "address_not_deliverable");
  }

  const pickupDate = new Date().toISOString().slice(0, 10);
  const ratePayload = await shipbubbleRequest("/shipping/fetch_rates", {
    sender_address_code: senderAddressCode,
    reciever_address_code: receiverAddressCode,
    pickup_date: pickupDate,
    category_id: categoryId,
    package_items: context.cartSnapshot.map((item) => ({
      name: item.name,
      description: item.customs_description || item.name,
      unit_weight: (item.weight_grams / 1000).toFixed(3),
      unit_amount: String(Math.round(item.price_ngn)),
      quantity: String(item.quantity),
    })),
    service_type: "pickup",
    delivery_instructions: address.specialInstructions || "",
    package_dimension: context.parcel.dimensions,
  });

  const rateData = parseJsonResponse(ratePayload.data);
  const couriers = Array.isArray(rateData.couriers) ? rateData.couriers : [];
  const eligible = couriers
    .map((courier) => parseJsonResponse(courier))
    .filter((courier) => String(courier.service_type || "").toLowerCase() === "pickup")
    .map((courier) => ({
      courier,
      amount: Number(courier.total),
      currency: normalizeCurrency(courier.currency || courier.rate_card_currency),
    }))
    .filter((entry) => entry.currency === "NGN" && Number.isFinite(entry.amount) && entry.amount > 0 && normalizeText(entry.courier.courier_id) && normalizeText(entry.courier.service_code));

  if (!eligible.length) {
    throw new ShippingError("No eligible pickup rate is available for this destination and parcel.", 422, "no_shipping_rate");
  }
  eligible.sort((a, b) => a.amount - b.amount);
  const selected = eligible[0];
  const courier = selected.courier;
  const carrierAmountNgn = Number(selected.amount.toFixed(2));
  const markupAmountNgn = Math.ceil(carrierAmountNgn * 0.02);
  const customerAmountNgn = carrierAmountNgn + markupAmountNgn;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const requestToken = normalizeText(rateData.request_token);
  if (!requestToken) throw new ShippingError("The shipping provider returned an incomplete quote.", 502, "shipping_provider_error");

  const { data: quote, error: quoteError } = await service.from("shipping_quotes").insert({
    user_id: userId,
    provider: "shipbubble",
    request_token: requestToken,
    courier_id: normalizeText(courier.courier_id),
    service_code: normalizeText(courier.service_code),
    courier_name: normalizeText(courier.courier_name) || "Shipping carrier",
    currency: "NGN",
    carrier_amount_ngn: carrierAmountNgn,
    markup_amount_ngn: markupAmountNgn,
    customer_amount_ngn: customerAmountNgn,
    pickup_eta: normalizeText(courier.pickup_eta) || null,
    delivery_eta: normalizeText(courier.delivery_eta) || "Provider estimate unavailable",
    pickup_date: pickupDate,
    origin_address_code: senderAddressCode,
    destination_address_code: receiverAddressCode,
    destination: stableAddress(address),
    destination_signature: destinationSignature,
    parcel: context.parcel,
    cart_snapshot: context.cartSnapshot,
    cart_signature: context.cartSignature,
    duties_mode: "ddu",
    status: "quoted",
    expires_at: expiresAt,
    provider_response: {
      request_token: requestToken,
      selected_rate: courier,
      available_rate_count: eligible.length,
    },
  }).select("id, provider, courier_name, service_code, currency, carrier_amount_ngn, markup_amount_ngn, customer_amount_ngn, pickup_eta, delivery_eta, duties_mode, expires_at, cart_signature, destination_signature").single();

  if (quoteError || !quote) {
    console.error("[Shipping] Failed to persist quote:", quoteError?.message || "missing quote");
    throw new ShippingError("The shipping quote could not be saved. Please try again.", 500, "shipping_quote_persistence_error");
  }

  return {
    quote: {
      id: quote.id,
      provider: quote.provider,
      carrier: quote.courier_name,
      service: quote.service_code,
      currency: quote.currency,
      carrierRateNgn: Number(quote.carrier_amount_ngn),
      markupNgn: Number(quote.markup_amount_ngn),
      customerShippingNgn: Number(quote.customer_amount_ngn),
      pickupEta: quote.pickup_eta,
      deliveryEta: quote.delivery_eta,
      dutiesMode: quote.duties_mode,
      expiresAt: quote.expires_at,
    },
    parcel: {
      weightGrams: context.parcel.weightGrams,
      weightKg: context.parcel.weightKg,
      dimensions: context.parcel.dimensions,
    },
    merchandiseSubtotalNgn: context.merchandiseSubtotalNgn,
  };
}

export async function getValidShippingQuote(service: SupabaseClient, userId: string, quoteId: unknown) {
  const id = normalizeText(quoteId);
  if (!id) throw new ShippingError("A live shipping quote is required before payment.", 422, "shipping_quote_required");
  const { data: quote, error } = await service.from("shipping_quotes").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new ShippingError("Unable to verify the shipping quote.", 500, "shipping_quote_error");
  if (!quote) throw new ShippingError("The shipping quote was not found. Please calculate shipping again.", 409, "shipping_quote_missing");
  if (String(quote.status) !== "quoted" || !quote.expires_at || new Date(quote.expires_at).getTime() <= Date.now()) {
    throw new ShippingError("The shipping quote has expired. Please calculate shipping again.", 409, "shipping_quote_expired");
  }
  return quote as ShippingQuoteRow;
}

export async function assertShippingQuoteMatchesCart(service: SupabaseClient, userId: string, quote: ShippingQuoteRow) {
  const context = await getCartShippingContext(service, userId);
  if (context.cartSignature !== quote.cart_signature) {
    throw new ShippingError("The cart changed after shipping was calculated. Please calculate shipping again.", 409, "cart_changed");
  }
  return context;
}

export async function assertShippingQuoteMatchesAddress(quote: ShippingQuoteRow, rawAddress: unknown) {
  const address = parseShippingAddress(rawAddress);
  const signature = await sha256(JSON.stringify(stableAddress(address)));
  if (signature !== quote.destination_signature) {
    throw new ShippingError("The delivery address changed after shipping was calculated. Please calculate shipping again.", 409, "address_changed");
  }
}

export async function getValidatedOrderPaymentContext(service: SupabaseClient, userId: string, quoteId: unknown) {
  const quote = await getValidShippingQuote(service, userId, quoteId);
  const context = await assertShippingQuoteMatchesCart(service, userId, quote);
  const totalNgn = Number((context.merchandiseSubtotalNgn + Number(quote.customer_amount_ngn || 0)).toFixed(2));
  if (!Number.isFinite(totalNgn) || totalNgn <= 0) {
    throw new ShippingError("The order total could not be calculated.", 409, "invalid_order_total");
  }
  return { quote, context, totalNgn };
}
