import { useEffect, useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    webpayCheckout?: {
      setup: (config: InterswitchConfig) => void;
    };
  }
}

interface InterswitchConfig {
  merchantCode: string;
  payItemId: string;
  transactionReference: string;
  amount: number;
  currency: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  redirectUrl: string;
  hash: string;
  mode: 'TEST' | 'LIVE';
  callback?: (response: InterswitchResponse) => void;
}

interface InterswitchResponse {
  resp: string;
  desc: string;
  txnref: string;
  payRef?: string;
  retRef?: string;
  cardNum?: string;
  amount?: number;
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

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    
    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
      console.log('Interswitch checkout script loaded successfully');
    };

    script.onerror = () => {
      setError('Failed to load payment script');
      setIsLoading(false);
      console.error('Failed to load Interswitch checkout script');
    };

    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, [scriptUrl]);

  const launchCheckout = useCallback((config: InterswitchConfig) => {
    if (!window.webpayCheckout) {
      console.error('webpayCheckout not available');
      setError('Payment widget not loaded. Please try again.');
      return;
    }

    try {
      console.log('Launching Interswitch checkout with config:', {
        ...config,
        hash: config.hash.substring(0, 20) + '...',
      });
      window.webpayCheckout.setup(config);
    } catch (err: any) {
      console.error('Error launching checkout:', err);
      setError(err.message || 'Failed to launch payment');
    }
  }, []);

  return { isLoaded, isLoading, error, launchCheckout };
}
