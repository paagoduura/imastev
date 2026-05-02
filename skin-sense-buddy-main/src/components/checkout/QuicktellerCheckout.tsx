import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/config";
import { APP_URL, FUNCTIONS_BASE } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";

interface QuicktellerCheckoutProps {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  paymentType?: "general" | "salon_booking" | "subscription" | "telehealth" | "order" | "analysis";
  planId?: string;
  scanId?: string;
  metadata?: Record<string, unknown>;
  redirectPath?: string;
  onPaymentSuccess?: (transactionRef: string) => void;
  onDismiss?: () => void;
}

type QuicktellerResponse = {
  responseCode?: string;
  responseDescription?: string;
  resp?: string;
  desc?: string;
  status?: string;
};

type QuicktellerInlineConfig = Record<string, unknown> & {
  txn_ref?: string;
  cust_mobile_no?: string;
  onComplete?: (response: QuicktellerResponse) => void;
  callback?: (response: QuicktellerResponse) => void;
};

type PaymentInitResponse = {
  success?: boolean;
  error?: string;
  transactionRef?: string;
  paymentUrl?: string;
  scriptUrl?: string;
  inlineConfig?: QuicktellerInlineConfig | null;
};

declare global {
  interface Window {
    webpayCheckout?:
      | ((config: QuicktellerInlineConfig) => void)
      | { setup: (config: QuicktellerInlineConfig) => void };
  }
}

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (trimmed.startsWith("00")) return `+${digits.slice(2)}`;
  return digits;
}

export function QuicktellerCheckout({
  amount,
  customerName,
  customerEmail,
  customerPhone,
  description = "Payment",
  paymentType = "order",
  planId,
  scanId,
  metadata,
  redirectPath = "/payment-callback",
  onPaymentSuccess,
  onDismiss,
}: QuicktellerCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<QuicktellerInlineConfig | null>(null);
  const [txnRef, setTxnRef] = useState<string | null>(null);
  const [hostedPaymentUrl, setHostedPaymentUrl] = useState<string | null>(null);

  const normalizedPhone = normalizePhoneNumber(customerPhone);
  const serializedMetadata = JSON.stringify(metadata ?? null);
  const initEndpoints = useMemo(
    () =>
      Array.from(
        new Set(
          [
            `${API_BASE}/payment/initialize`,
            FUNCTIONS_BASE ? `${FUNCTIONS_BASE}/api/payment/initialize` : null,
          ].filter(Boolean) as string[],
        ),
      ),
    [],
  );
  const resolvedRedirectPath =
    redirectPath.startsWith("http://") || redirectPath.startsWith("https://")
      ? redirectPath
      : `${APP_URL}${redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`}`;

  const loadQuicktellerScript = useCallback((scriptUrl: string) => {
    const existing = document.getElementById("quickteller-script");
    if (existing) {
      if (window.webpayCheckout) {
        setScriptLoaded(true);
      } else {
        existing.addEventListener("load", () => setScriptLoaded(true), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "quickteller-script";
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load payment script. Please use Web Checkout instead.");
    document.body.appendChild(script);
  }, []);

  const initializePayment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const legacyToken = localStorage.getItem("glowsense_token");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = legacyToken || session?.access_token || null;

      const requestBody = {
        amount,
        customerEmail,
        customerName,
        customerPhone: normalizedPhone,
        description,
        planId,
        scanId,
        metadata: serializedMetadata ? JSON.parse(serializedMetadata) : null,
        redirectPath: resolvedRedirectPath,
      };

      const makeInitRequest = async (typeOverride?: QuicktellerCheckoutProps["paymentType"]) => {
        let lastResponse: Response | null = null;
        let lastPayload: PaymentInitResponse = {};
        let lastError: Error | null = null;

        for (const endpoint of initEndpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                ...requestBody,
                paymentType: typeOverride || paymentType,
              }),
            });

            const payload = (await response.json().catch(() => ({}))) as PaymentInitResponse;
            lastResponse = response;
            lastPayload = payload;

            if (response.ok || response.status !== 502) {
              return { response, payload };
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error("Failed to initialize payment");
          }
        }

        if (lastResponse) {
          return { response: lastResponse, payload: lastPayload };
        }

        throw lastError || new Error("Failed to initialize payment");
      };

      let { response, payload: data } = await makeInitRequest();

      if (
        !response.ok &&
        paymentType === "analysis" &&
        typeof data?.error === "string" &&
        (
          data.error.toLowerCase().includes("scanid is required") ||
          data.error.toLowerCase().includes("authentication is required for analysis payments") ||
          data.error.toLowerCase().includes("invalid scan for analysis payment")
        )
      ) {
        const fallback = await makeInitRequest("general");
        response = fallback.response;
        data = fallback.payload;
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status}): Failed to initialize payment`);
      }

      if (data.success && data.inlineConfig && data.scriptUrl) {
        setPaymentConfig(data.inlineConfig);
        setTxnRef(data.transactionRef || data.inlineConfig.txn_ref || null);
        setHostedPaymentUrl(data.paymentUrl || null);
        loadQuicktellerScript(data.scriptUrl);
      } else {
        throw new Error(data.error || "Unable to initialize payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    customerEmail,
    customerName,
    description,
    loadQuicktellerScript,
    normalizedPhone,
    paymentType,
    planId,
    resolvedRedirectPath,
    scanId,
    serializedMetadata,
    initEndpoints,
  ]);

  useEffect(() => {
    initializePayment();
  }, [initializePayment]);

  const handleInlineCheckout = () => {
    if (!paymentConfig || !window.webpayCheckout) {
      setError("Payment widget not ready. Please refresh and try again.");
      return;
    }

    try {
      const config: QuicktellerInlineConfig = {
        ...paymentConfig,
        cust_mobile_no: normalizedPhone,
        onComplete: (response: QuicktellerResponse) => {
          const code = response?.responseCode || response?.resp;
          if (code === "00" || response?.status === "successful" || response?.status === "pending") {
            onPaymentSuccess?.(txnRef || paymentConfig.txn_ref || "");
          } else if (code && code !== "00") {
            setError(`Payment declined: ${response?.responseDescription || response?.desc || code}`);
          }
        },
        callback: (response: QuicktellerResponse) => {
          const code = response?.responseCode || response?.resp;
          if (code === "00" || response?.status === "successful" || response?.status === "pending") {
            onPaymentSuccess?.(txnRef || paymentConfig.txn_ref || "");
          }
        },
      };

      if (typeof window.webpayCheckout === "function") {
        window.webpayCheckout(config);
      } else {
        window.webpayCheckout.setup(config);
      }
    } catch (err) {
      setError(`Unable to open payment form: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleHostedCheckout = () => {
    if (!hostedPaymentUrl) {
      setError("Secure checkout link is unavailable. Please retry.");
      return;
    }
    window.location.href = hostedPaymentUrl;
  };

  const isReady = !loading && !error && paymentConfig;

  return (
    <Card className="w-full border-0 shadow-xl">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-purple-600 to-amber-600 px-4 py-3 text-white">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          Payment Checkout
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        <div className="space-y-1.5 rounded-lg bg-gray-50 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Customer:</span>
            <span className="font-medium text-gray-900">{customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email:</span>
            <span className="break-all text-xs font-medium text-gray-900">{customerEmail}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phone:</span>
            <span className="font-medium text-gray-900">{normalizedPhone}</span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-amber-50 p-3 text-center">
          <p className="mb-0.5 text-xs text-gray-500">Amount to Pay</p>
          <p className="bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-3xl font-bold text-transparent">
            NGN {amount.toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="mb-0.5 font-semibold">Payment Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {(loading || (!scriptLoaded && !error)) && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing payment...
          </div>
        )}

        {isReady && (
          <Button
            onClick={handleInlineCheckout}
            disabled={!scriptLoaded}
            className="h-12 w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-base font-semibold text-white hover:from-green-600 hover:to-emerald-700"
          >
            {!scriptLoaded ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Proceed to Payment - NGN {amount.toLocaleString()}
              </>
            )}
          </Button>
        )}

        {isReady && hostedPaymentUrl && (
          <Button onClick={handleHostedCheckout} variant="outline" className="h-10 w-full text-sm">
            Open Hosted Checkout Instead
          </Button>
        )}

        {error && (
          <Button onClick={initializePayment} variant="outline" className="h-9 w-full text-sm">
            Retry
          </Button>
        )}

        <div className="flex gap-2 rounded-lg bg-blue-50 p-2 text-xs text-gray-500">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span>Secured by Interswitch Quickteller and all payment channels supported.</span>
        </div>

        {onDismiss && (
          <Button onClick={onDismiss} variant="outline" className="h-9 w-full text-sm" disabled={loading}>
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
