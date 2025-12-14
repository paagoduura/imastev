import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

const API_BASE = '/api';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

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
        setTransactionDetails({
          transactionRef,
          amount: result.amount,
          paymentRef: result.paymentRef,
        });
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

          {status === 'success' && (
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

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate('/salon-booking')}
                    className="bg-gradient-to-r from-purple-600 to-amber-500"
                  >
                    Book Another Appointment
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
                    onClick={() => navigate('/salon-booking')}
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
