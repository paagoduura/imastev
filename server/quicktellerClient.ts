import crypto from 'crypto';

const QUICKTELLER_BASE_URL = process.env.QUICKTELLER_ENV === 'production' 
  ? 'https://webpay.interswitchng.com' 
  : 'https://sandbox.interswitchng.com';

const QUICKTELLER_API_URL = process.env.QUICKTELLER_ENV === 'production'
  ? 'https://webpay.interswitchng.com/paydirect/api/v1'
  : 'https://sandbox.interswitchng.com/api/v1';

interface QuicktellerConfig {
  clientId: string;
  clientSecret: string;
  merchantCode: string;
  paymentItemId: string;
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
  error?: string;
}

interface VerifyResponse {
  success: boolean;
  status: 'successful' | 'pending' | 'failed';
  amount?: number;
  transactionRef?: string;
  paymentRef?: string;
  error?: string;
}

function getConfig(): QuicktellerConfig {
  return {
    clientId: process.env.QUICKTELLER_CLIENT_ID || '',
    clientSecret: process.env.QUICKTELLER_CLIENT_SECRET || '',
    merchantCode: process.env.QUICKTELLER_MERCHANT_CODE || '',
    paymentItemId: process.env.QUICKTELLER_PAYMENT_ITEM_ID || '',
  };
}

function generateTransactionRef(): string {
  return `IMSTEV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateHash(transactionRef: string, amount: number, redirectUrl: string): string {
  const config = getConfig();
  const hashString = `${transactionRef}${config.paymentItemId}${amount}${redirectUrl}${config.clientSecret}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

export async function initializePayment(data: PaymentInitData): Promise<PaymentResponse> {
  const config = getConfig();
  
  if (!config.clientId || !config.clientSecret || !config.merchantCode || !config.paymentItemId) {
    return { success: false, error: 'Quickteller credentials not configured' };
  }

  try {
    const amountInKobo = Math.round(data.amount * 100);
    const hash = generateHash(data.transactionRef, amountInKobo, data.redirectUrl);
    
    const paymentUrl = `${QUICKTELLER_BASE_URL}/collections/w/pay?` + new URLSearchParams({
      merchantCode: config.merchantCode,
      payItemId: config.paymentItemId,
      transactionRef: data.transactionRef,
      amount: amountInKobo.toString(),
      currency: '566', // NGN currency code
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerMobile: data.customerPhone,
      redirectUrl: data.redirectUrl,
      hash: hash,
    }).toString();

    return {
      success: true,
      paymentUrl,
      transactionRef: data.transactionRef,
    };
  } catch (error: any) {
    console.error('Quickteller payment initialization error:', error);
    return { success: false, error: error.message || 'Failed to initialize payment' };
  }
}

export async function verifyPayment(transactionRef: string): Promise<VerifyResponse> {
  const config = getConfig();
  
  if (!config.clientId || !config.clientSecret || !config.merchantCode) {
    return { success: false, status: 'failed', error: 'Quickteller credentials not configured' };
  }

  try {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const nonce = crypto.randomBytes(16).toString('hex');
    const signatureMethod = 'SHA1';
    
    const signatureBase = `${config.clientId}&${timestamp}&${nonce}&${config.clientSecret}`;
    const signature = crypto.createHash('sha1').update(signatureBase).digest('base64');
    
    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    const response = await fetch(
      `${QUICKTELLER_API_URL}/gettransaction.json?merchantcode=${config.merchantCode}&transactionreference=${transactionRef}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
          'Timestamp': timestamp,
          'Nonce': nonce,
          'SignatureMethod': signatureMethod,
          'Signature': signature,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Quickteller verify error:', errorText);
      return { success: false, status: 'failed', error: 'Failed to verify payment' };
    }

    const result = await response.json() as {
      ResponseCode?: string;
      ResponseDescription?: string;
      Amount?: number;
      MerchantReference?: string;
      PaymentReference?: string;
    };
    
    if (result.ResponseCode === '00') {
      return {
        success: true,
        status: 'successful',
        amount: (result.Amount || 0) / 100,
        transactionRef: result.MerchantReference,
        paymentRef: result.PaymentReference,
      };
    } else if (result.ResponseCode === '09' || result.ResponseCode === '10') {
      return {
        success: true,
        status: 'pending',
        transactionRef: result.MerchantReference,
      };
    } else {
      return {
        success: false,
        status: 'failed',
        error: result.ResponseDescription || 'Payment verification failed',
      };
    }
  } catch (error: any) {
    console.error('Quickteller verification error:', error);
    return { success: false, status: 'failed', error: error.message || 'Verification failed' };
  }
}

export { generateTransactionRef };
