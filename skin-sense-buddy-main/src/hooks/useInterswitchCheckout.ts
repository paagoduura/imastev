import { useCallback, useEffect, useRef, useState } from "react";

interface InterswitchResponse {
  resp: string;
  desc: string;
  txnref: string;
  payRef?: string;
  retRef?: string;
  cardNum?: string;
  amount?: number;
}

interface InterswitchConfig {
  merchantCode?: string;
  payItemId?: string;
  transactionReference?: string;
  amount: number;
  currency?: number | string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  redirectUrl?: string;
  mode?: "TEST" | "LIVE";
  merchant_code?: string;
  pay_item_id?: string;
  txn_ref?: string;
  site_redirect_url?: string;
  cust_name?: string;
  cust_email?: string;
  cust_mobile_no?: string;
  cust_id?: string;
  pay_item_name?: string;
  tokenise_card?: string;
  access_token?: string;
  hash?: string;
  onComplete?: (response: InterswitchResponse) => void;
  callback?: (response: InterswitchResponse) => void;
}

type WebpayCheckoutConfig = InterswitchConfig;

declare global {
  interface Window {
    webpayCheckout?:
      | ((config: WebpayCheckoutConfig) => void)
      | {
          setup: (config: WebpayCheckoutConfig) => void;
        };
  }
}

interface UseInterswitchCheckoutResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  launchCheckout: (config: InterswitchConfig) => void;
}

export function useInterswitchCheckout(scriptUrl: string | null): UseInterswitchCheckoutResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!scriptUrl) return;

    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
      console.log("Interswitch checkout script loaded successfully");
    };

    script.onerror = () => {
      setError("Failed to load payment script");
      setIsLoading(false);
      console.error("Failed to load Interswitch checkout script");
    };

    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, [scriptUrl]);

  const normalizeCheckoutConfig = useCallback((config: InterswitchConfig): InterswitchConfig => {
    if (config.merchant_code && config.pay_item_id && config.txn_ref) {
      return {
        ...config,
        pay_item_name: config.pay_item_name || "IMSTEV NATURALS Payment",
        currency: String(config.currency ?? "566"),
        mode: config.mode || "TEST",
        onComplete: config.onComplete || config.callback,
      };
    }

    return {
      merchant_code: config.merchantCode,
      pay_item_id: config.payItemId,
      pay_item_name: config.pay_item_name || "IMSTEV NATURALS Payment",
      txn_ref: config.transactionReference,
      amount: config.amount,
      currency: String(config.currency ?? 566),
      site_redirect_url: config.redirectUrl,
      cust_id: config.customerEmail,
      cust_name: config.customerName,
      cust_email: config.customerEmail,
      cust_mobile_no: config.customerMobile,
      tokenise_card: config.tokenise_card,
      access_token: config.access_token,
      mode: config.mode || "TEST",
      hash: config.hash,
      onComplete: config.onComplete || config.callback,
    };
  }, []);

  const launchCheckout = useCallback(
    (config: InterswitchConfig) => {
      if (!window.webpayCheckout) {
        console.error("webpayCheckout not available");
        setError("Payment widget not loaded. Please try again.");
        return;
      }

      try {
        const normalizedConfig = normalizeCheckoutConfig(config);
        console.log("Launching Interswitch checkout with config:", {
          ...normalizedConfig,
          hash: normalizedConfig.hash ? `${normalizedConfig.hash.substring(0, 20)}...` : undefined,
        });

        if (typeof window.webpayCheckout === "function") {
          window.webpayCheckout(normalizedConfig);
        } else {
          window.webpayCheckout.setup(normalizedConfig);
        }
      } catch (err) {
        console.error("Error launching checkout:", err);
        setError(err instanceof Error ? err.message : "Failed to launch payment");
      }
    },
    [normalizeCheckoutConfig],
  );

  return { isLoaded, isLoading, error, launchCheckout };
}
