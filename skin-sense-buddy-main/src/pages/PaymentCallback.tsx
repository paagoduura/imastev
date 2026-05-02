import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { API_BASE } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";
import { MONTHLY_SCAN_SUBSCRIPTION_LIMIT } from "@/lib/scanPayments";

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'successful' | 'pending' | 'failed'>('loading');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [postPaymentMessage, setPostPaymentMessage] = useState<string>("");
  const [analysisScanId, setAnalysisScanId] = useState<string | null>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const getApiToken = async () => {
    const legacyToken = localStorage.getItem('glowsense_token');
    if (legacyToken) return legacyToken;

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const finalizeAnalysisForScan = async (storedScanId: string, paymentOption: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPostPaymentMessage("Payment verified. Please return to your results page.");
      return;
    }

    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', storedScanId)
      .single();

    if (scanError || !scanData) {
      throw new Error(scanError?.message || 'Scan not found');
    }

    const imageUrls = scanData.capture_info?.image_urls || scanData.multi_angle_urls || {};
    const primaryAngle = scanData.scan_type === 'hair' ? 'scalp_parting' : 'close';
    const functionName = scanData.scan_type === 'hair' ? 'analyze-hair' : 'analyze-skin';

    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(functionName, {
      body: {
        scanId: scanData.id,
        imageUrl: imageUrls[primaryAngle] || scanData.image_url,
        multiAngleUrls: imageUrls,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (analysisError || !analysisData?.success) {
      throw new Error(analysisError?.message || analysisData?.error || 'Analysis failed');
    }

    setPostPaymentMessage(
      paymentOption === 'subscription'
        ? `Payment verified, your monthly scan plan is active, and analysis is completed. You now have ${MONTHLY_SCAN_SUBSCRIPTION_LIMIT} scans available this cycle.`
        : "Payment verified and analysis completed."
    );
  };

  const finalizePostPayment = async (verifiedTransactionRef: string) => {
    const pendingType = sessionStorage.getItem('pendingPaymentType');
    if (pendingType) {
      setPaymentType(pendingType);
    }

    if (pendingType === 'telehealth') {
      const processedKey = `telehealth-payment-${verifiedTransactionRef}`;
      if (sessionStorage.getItem(processedKey) === 'done') {
        setPostPaymentMessage("Your consultation request is already confirmed.");
        return;
      }

      const appointmentPayload = sessionStorage.getItem('pendingAppointment');
      const token = await getApiToken();
      if (!appointmentPayload || !token) {
        setPostPaymentMessage("Payment received. Please book your consultation slot from Telehealth.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: appointmentPayload,
        });

        if (!response.ok) {
          throw new Error(`Unable to create consultation appointment (${response.status})`);
        }

        sessionStorage.setItem(processedKey, 'done');
        sessionStorage.removeItem('pendingAppointment');
        sessionStorage.removeItem('pendingPaymentType');
        setPostPaymentMessage("Payment verified and your consultation appointment is confirmed.");
      } catch (error) {
        console.error("Failed to finalize telehealth appointment:", error);
        setPostPaymentMessage("Payment verified, but we could not auto-create your appointment. Please contact support or rebook in Telehealth.");
      }
      return;
    }

    if (pendingType === 'salon_booking') {
      const pendingBooking = sessionStorage.getItem('pendingSalonBooking');
      const token = await getApiToken();
      if (!pendingBooking || !token) {
        setPostPaymentMessage("Payment verified. Please complete your booking in the salon page.");
        sessionStorage.removeItem('pendingPaymentType');
        sessionStorage.removeItem('pendingSalonBooking');
        return;
      }

      try {
        const bookingData = JSON.parse(pendingBooking);
        const response = await fetch(`${API_BASE}/salon/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...bookingData.formData,
            transactionRef: verifiedTransactionRef,
          }),
        });

        if (!response.ok) {
          throw new Error(`Unable to confirm booking (${response.status})`);
        }

        sessionStorage.removeItem('pendingPaymentType');
        sessionStorage.removeItem('pendingSalonBooking');
        setPostPaymentMessage("Payment verified and your salon booking is confirmed.");
      } catch (error) {
        console.error("Failed to finalize salon booking:", error);
        setPostPaymentMessage("Payment verified, but we couldn't finalize your booking. Please contact support.");
      }
      return;
    }

    if (pendingType === 'subscription') {
      const storedScanId = sessionStorage.getItem('pendingAnalysisScanId') || searchParams.get('scanId');
      const paymentOption = sessionStorage.getItem('paymentOption') || 'subscription';
      if (storedScanId) {
        setAnalysisScanId(storedScanId);
      }
      sessionStorage.removeItem('pendingPaymentType');
      sessionStorage.removeItem('pendingSubscriptionPlanId');
      sessionStorage.removeItem('pendingAnalysisScanId');
      sessionStorage.removeItem('paymentOption');

      try {
        if (storedScanId) {
          await finalizeAnalysisForScan(storedScanId, paymentOption);
        } else {
          setPostPaymentMessage(`Payment verified and your monthly scan plan is now active with ${MONTHLY_SCAN_SUBSCRIPTION_LIMIT} scans.`);
        }
      } catch (error) {
        console.error("Failed to process subscription scan:", error);
        setPostPaymentMessage("Payment verified and your scan plan is active. We're preparing your results now.");
      }
      return;
    }

    if (pendingType === 'analysis') {
      const storedScanId = sessionStorage.getItem('pendingAnalysisScanId') || searchParams.get('scanId');
      const paymentOption = sessionStorage.getItem('paymentOption') || 'one-time';
      
      if (storedScanId) {
        setAnalysisScanId(storedScanId);
      }
      sessionStorage.removeItem('pendingPaymentType');
      sessionStorage.removeItem('pendingAnalysisScanId');
      sessionStorage.removeItem('paymentOption');

      try {
        if (storedScanId) {
          await finalizeAnalysisForScan(storedScanId, paymentOption);
        } else {
          setPostPaymentMessage("Payment verified.");
        }
      } catch (error) {
        console.error("Failed to process payment:", error);
        setPostPaymentMessage("Payment verified. We're preparing your results. Please refresh in a moment.");
      }
      return;
    }

    if (pendingType === 'order') {
      const pendingOrder = sessionStorage.getItem('pendingOrderData');
      const token = await getApiToken();
      if (!pendingOrder || !token) {
        setPostPaymentMessage("Payment verified. Please complete your order in the cart.");
        sessionStorage.removeItem('pendingPaymentType');
        sessionStorage.removeItem('pendingOrderData');
        return;
      }

      try {
        const pending = JSON.parse(pendingOrder);
        await fetch(`${API_BASE}/checkout/send-details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...pending.formData,
            cartItems: pending.cartItems,
            cartTotal: pending.cartTotal
          })
        });

        const orderResponse = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            shipping_address: {
              name: pending.formData.fullName,
              email: pending.formData.email,
              phone: pending.formData.phone,
              address: pending.formData.deliveryAddress,
              city: pending.formData.city,
              state: pending.formData.state,
              country: pending.formData.country,
              zipCode: pending.formData.zipCode
            },
            payment_method: 'quickteller',
            payment_status: 'paid',
            shipping_fee_ngn: pending.shippingFee ?? 0,
            payment_reference: verifiedTransactionRef,
          })
        });

        if (!orderResponse.ok) {
          throw new Error(`Unable to create order (${orderResponse.status})`);
        }

        sessionStorage.removeItem('pendingPaymentType');
        sessionStorage.removeItem('pendingOrderData');
        setPostPaymentMessage("Payment verified and your order has been created.");
      } catch (error) {
        console.error("Failed to finalize order:", error);
        setPostPaymentMessage("Payment verified, but we couldn't finalize your order. Please contact support.");
      }
      return;
    }
  };

  const verifyPayment = async () => {
    const transactionRef = searchParams.get('txnref') || searchParams.get('transactionRef');
    
    if (!transactionRef) {
      setStatus('failed');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/payment/verify/${transactionRef}`);
      const result = await response.json();

      if (result.success) {
        setStatus(result.status);
        setPaymentType(sessionStorage.getItem('pendingPaymentType') || result.paymentType || null);
        setTransactionDetails({
          transactionRef: result.transactionRef || transactionRef,
          amount: result.amount ?? 0,
          paymentRef: result.paymentRef,
        });
        if (result.status === 'successful') {
          await finalizePostPayment(transactionRef);
        }
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-amber-50/20">
      <Navbar />
      <div className="pt-24 pb-16 min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-lg">
          {status === 'loading' && (
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-6 text-purple-600 animate-spin" />
                <h2 className="text-2xl font-display font-bold mb-2">Verifying Payment</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
              </CardContent>
            </Card>
          )}

          {status === 'successful' && (
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2 text-emerald-600">Payment Successful!</h2>
                <p className="text-muted-foreground mb-6">Your payment has been confirmed.</p>
                
                {transactionDetails && (
                  <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
                    <div className="flex justify-between mb-3">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-bold text-lg">{formatPrice(transactionDetails.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference</span>
                      <span className="font-mono text-sm">{transactionDetails.transactionRef}</span>
                    </div>
                  </div>
                )}

                {postPaymentMessage && (
                  <p className="text-sm text-emerald-700 mb-6">{postPaymentMessage}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() =>
                      navigate(
                        paymentType === 'telehealth'
                          ? '/telehealth'
                          : paymentType === 'analysis'
                            ? (analysisScanId ? `/results/${analysisScanId}` : '/dashboard')
                            : paymentType === 'subscription'
                              ? (analysisScanId ? `/results/${analysisScanId}` : '/subscription')
                            : paymentType === 'order'
                              ? '/orders'
                              : '/salon-booking'
                      )
                    }
                    className="bg-gradient-to-r from-purple-600 to-amber-500"
                  >
                    {paymentType === 'telehealth'
                      ? 'Go to Telehealth'
                      : paymentType === 'analysis'
                        ? 'View Results'
                        : paymentType === 'subscription'
                          ? (analysisScanId ? 'View Results' : 'View Subscription')
                        : paymentType === 'order'
                          ? 'View Orders'
                          : 'Book Another Appointment'}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {status === 'pending' && (
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                  <Clock className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2 text-amber-600">Payment Pending</h2>
                <p className="text-muted-foreground mb-6">
                  Your payment is being processed. This usually takes a few minutes.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  You will receive a confirmation once the payment is complete.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={verifyPayment} variant="outline">
                    Check Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {status === 'failed' && (
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2 text-red-600">Payment Failed</h2>
                <p className="text-muted-foreground mb-6">
                  We couldn't verify your payment. Please try again or contact support.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate(analysisScanId ? `/results/${analysisScanId}` : '/dashboard')}
                    className="bg-gradient-to-r from-purple-600 to-amber-500"
                  >
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
