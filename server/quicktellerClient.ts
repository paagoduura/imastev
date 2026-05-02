import crypto from 'crypto';

const envValue = (process.env.QUICKTELLER_ENV || 'live').trim().toLowerCase();
const isProduction = !['sandbox', 'test', 'qa', 'development', 'dev'].includes(envValue);
const QUICKTELLER_CHECKOUT_BASE = isProduction
  ? 'https://newwebpay.interswitchng.com'
  : 'https://newwebpay.qa.interswitchng.com';
const QUICKTELLER_WEBPAY_BASE = isProduction
  ? 'https://webpay.interswitchng.com'
  : 'https://qa.interswitchng.com';
const QUICKTELLER_OAUTH_URL = isProduction
  ? 'https://api.interswitchng.com/passport/oauth/token'
  : 'https://qa.interswitchng.com/passport/oauth/token';
const QUICKTELLER_TXN_URL = `${QUICKTELLER_WEBPAY_BASE}/collections/api/v1/gettransaction.json`;

interface QuicktellerConfig {
  clientId: string;
  clientSecret: string;
  merchantCode: string;
  paymentItemId: string;
}

export interface QuicktellerInlineCheckoutConfig {
  merchant_code: string;
  pay_item_id: string;
  pay_item_name: string;
  txn_ref: string;
  amount: number;
  currency: string;
  site_redirect_url: string;
  cust_id?: string;
  cust_name?: string;
  cust_email: string;
  cust_mobile_no?: string;
  access_token?: string;
  mode: 'TEST' | 'LIVE';
}

interface PaymentInitData {
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  transactionRef: string;
  redirectUrl: string;
  description?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionRef?: string;
  scriptUrl?: string;
  inlineConfig?: QuicktellerInlineCheckoutConfig;
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  status: 'successful' | 'pending' | 'failed';
  amount?: number;
  transactionRef?: string;
  paymentRef?: string;
  responseCode?: string;
  error?: string;
  raw?: unknown;
}

let oauthTokenCache: { token: string; expiresAtMs: number } | null = null;

function getConfig(): QuicktellerConfig {
  return {
    clientId: process.env.QUICKTELLER_CLIENT_ID?.trim() || '',
    clientSecret: process.env.QUICKTELLER_CLIENT_SECRET?.trim() || '',
    merchantCode: process.env.QUICKTELLER_MERCHANT_CODE?.trim() || '',
    paymentItemId: process.env.QUICKTELLER_PAYMENT_ITEM_ID?.trim() || '',
  };
}

function getCheckoutMode(): 'TEST' | 'LIVE' {
  return isProduction ? 'LIVE' : 'TEST';
}

function toMinorUnit(amount: number): number {
  return Math.round(amount * 100);
}

function parseResponseCode(payload: any): string {
  return (
    payload?.ResponseCode ||
    payload?.responseCode ||
    payload?.response_code ||
    payload?.respCode ||
    ''
  );
}

function parsePaymentReference(payload: any): string {
  return (
    payload?.PaymentReference ||
    payload?.paymentReference ||
    payload?.payment_ref ||
    payload?.payRef ||
    ''
  );
}

function parseMerchantReference(payload: any): string {
  return (
    payload?.MerchantReference ||
    payload?.merchantReference ||
    payload?.transactionReference ||
    payload?.transactionreference ||
    payload?.txnref ||
    ''
  );
}

function parseAmount(payload: any): number | undefined {
  const raw = payload?.Amount ?? payload?.amount;
  if (raw === undefined || raw === null) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric >= 100 ? numeric / 100 : numeric;
}

function getResponseDescription(payload: any): string {
  return payload?.ResponseDescription || payload?.responseDescription || payload?.desc || 'Unknown response';
}

export function generateTransactionRef(): string {
  return `IMSTEV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function getQuicktellerScriptUrl(): string {
  return `${QUICKTELLER_CHECKOUT_BASE}/inline-checkout.js`;
}

async function getOAuthToken(): Promise<string> {
  const config = getConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Quickteller client credentials are not configured');
  }

  const now = Date.now();
  if (oauthTokenCache && oauthTokenCache.expiresAtMs > now + 10_000) {
    return oauthTokenCache.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch(QUICKTELLER_OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to obtain Quickteller access token: ${details}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error('Quickteller access token response did not include access_token');
  }

  const expiresIn = Number(payload.expires_in || 1800);
  oauthTokenCache = {
    token: payload.access_token,
    expiresAtMs: now + Math.max(60, expiresIn - 30) * 1000,
  };

  return payload.access_token;
}

async function maybeGetAccessToken(): Promise<string | null> {
  try {
    const config = getConfig();
    if (!config.clientId || !config.clientSecret) return null;
    return await getOAuthToken();
  } catch (error) {
    console.warn('Quickteller access token not available; continuing without token.');
    return null;
  }
}

export async function buildInlineCheckoutConfig(
  data: PaymentInitData,
  paymentItemIdOverride?: string
): Promise<QuicktellerInlineCheckoutConfig> {
  const config = getConfig();
  const paymentItemId = paymentItemIdOverride?.trim() || config.paymentItemId;
  const accessToken = await maybeGetAccessToken();

  const inlineConfig: QuicktellerInlineCheckoutConfig = {
    merchant_code: config.merchantCode,
    pay_item_id: paymentItemId,
    pay_item_name: data.description?.trim() || 'IMSTEV NATURALS Payment',
    txn_ref: data.transactionRef,
    amount: toMinorUnit(data.amount),
    currency: '566',
    site_redirect_url: data.redirectUrl,
    cust_id: data.customerEmail,
    cust_name: data.customerName,
    cust_email: data.customerEmail,
    cust_mobile_no: data.customerPhone,
    mode: getCheckoutMode(),
  };

  if (accessToken) {
    inlineConfig.access_token = accessToken;
  }

  return inlineConfig;
}

function buildHostedPaymentUrl(inlineConfig: QuicktellerInlineCheckoutConfig): string {
  const params = new URLSearchParams({
    merchant_code: inlineConfig.merchant_code,
    pay_item_id: inlineConfig.pay_item_id,
    pay_item_name: inlineConfig.pay_item_name,
    txn_ref: inlineConfig.txn_ref,
    amount: String(inlineConfig.amount),
    currency: inlineConfig.currency,
    site_redirect_url: inlineConfig.site_redirect_url,
    cust_email: inlineConfig.cust_email,
    mode: inlineConfig.mode,
  });

  if (inlineConfig.cust_name) params.set('cust_name', inlineConfig.cust_name);
  if (inlineConfig.cust_mobile_no) params.set('cust_mobile_no', inlineConfig.cust_mobile_no);
  if (inlineConfig.cust_id) params.set('cust_id', inlineConfig.cust_id);
  if (inlineConfig.access_token) params.set('access_token', inlineConfig.access_token);

  return `${QUICKTELLER_CHECKOUT_BASE}/collections/w/pay?${params.toString()}`;
}

async function queryTransaction(transactionRef: string, amountMinor?: number): Promise<any> {
  const config = getConfig();
  if (!config.merchantCode) {
    throw new Error('Quickteller merchant code is not configured');
  }

  const params = new URLSearchParams({
    merchantcode: config.merchantCode,
    transactionreference: transactionRef,
  });
  if (amountMinor && Number.isFinite(amountMinor)) {
    params.set('amount', String(amountMinor));
  }

  const requestUrl = `${QUICKTELLER_TXN_URL}?${params.toString()}`;
  const headerVariants: Record<string, string>[] = [{ Accept: 'application/json' }];
  const token = await maybeGetAccessToken();
  if (token) {
    headerVariants.push({
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  let lastError: Error | null = null;
  for (const headers of headerVariants) {
    const response = await fetch(requestUrl, { method: 'GET', headers });
    if (response.ok) {
      return response.json();
    }

    const details = await response.text();
    lastError = new Error(`Quickteller transaction query failed (${response.status}): ${details}`);
  }

  throw lastError || new Error('Unable to query Quickteller transaction');
}

export async function initializePayment(
  data: PaymentInitData,
  paymentItemIdOverride?: string
): Promise<PaymentResponse> {
  const config = getConfig();
  if (!config.merchantCode || !config.paymentItemId) {
    return {
      success: false,
      error: 'Quickteller merchant credentials are not configured (merchant code/pay item id)',
    };
  }

  try {
    const inlineConfig = await buildInlineCheckoutConfig(data, paymentItemIdOverride);
    return {
      success: true,
      transactionRef: data.transactionRef,
      scriptUrl: getQuicktellerScriptUrl(),
      inlineConfig,
      paymentUrl: buildHostedPaymentUrl(inlineConfig),
    };
  } catch (error: any) {
    console.error('Quickteller payment initialization error:', error);
    return { success: false, error: error.message || 'Failed to initialize payment' };
  }
}

export async function verifyPayment(
  transactionRef: string,
  amountNgn?: number
): Promise<VerifyResponse> {
  try {
    const amountMinor = amountNgn && Number.isFinite(amountNgn) ? toMinorUnit(amountNgn) : undefined;
    const payload = await queryTransaction(transactionRef, amountMinor);
    const responseCode = parseResponseCode(payload);
    const merchantRef = parseMerchantReference(payload) || transactionRef;
    const paymentRef = parsePaymentReference(payload);
    const amount = parseAmount(payload);

    if (responseCode === '00') {
      return {
        success: true,
        status: 'successful',
        amount,
        transactionRef: merchantRef,
        paymentRef,
        responseCode,
        raw: payload,
      };
    }

    if (['09', '10', '11'].includes(responseCode)) {
      return {
        success: true,
        status: 'pending',
        amount,
        transactionRef: merchantRef,
        paymentRef,
        responseCode,
        raw: payload,
      };
    }

    return {
      success: false,
      status: 'failed',
      amount,
      transactionRef: merchantRef,
      paymentRef,
      responseCode,
      error: getResponseDescription(payload),
      raw: payload,
    };
  } catch (error: any) {
    console.error('Quickteller verification error:', error);
    return { success: false, status: 'failed', error: error.message || 'Verification failed' };
  }
}
