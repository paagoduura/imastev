import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuicktellerCheckout } from "@/components/checkout/QuicktellerCheckout";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PhoneNumberPrompt } from "@/components/checkout/PhoneNumberPrompt";

type CheckoutPaymentType = "analysis" | "subscription" | "salon_booking" | "telehealth";

interface PendingPayment {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentType: CheckoutPaymentType;
  planId?: string;
  scanId?: string;
  description?: string;
  serviceNames?: string[];
  appointmentDate?: string;
  timeSlot?: string;
  clinicianName?: string;
}

const formatTime12Hour = (slot: string) => {
  const [hoursText, minutesText] = slot.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return slot;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${meridiem}`;
};

export default function Payment() {
  const navigate = useNavigate();
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingPaymentPage");
    if (!stored) return;
    try {
      setPendingPayment(JSON.parse(stored) as PendingPayment);
    } catch {
      sessionStorage.removeItem("pendingPaymentPage");
    }
  }, []);

  const handlePaymentSuccess = (transactionRef: string) => {
    sessionStorage.removeItem("pendingPaymentPage");
    navigate(`/payment-callback?txnref=${encodeURIComponent(transactionRef)}`);
  };

  const handlePaymentPhoneSaved = (phone: string) => {
    setPendingPayment((current) => {
      if (!current) return current;
      const nextPayment = { ...current, customerPhone: phone };
      sessionStorage.setItem("pendingPaymentPage", JSON.stringify(nextPayment));
      return nextPayment;
    });
  };

  const isSalonBooking = pendingPayment?.paymentType === "salon_booking";
  const isTelehealth = pendingPayment?.paymentType === "telehealth";
  const isSubscription = pendingPayment?.paymentType === "subscription";
  const journeyLabel = isSalonBooking ? "Your appointment is ready" : isTelehealth ? "Your consultation is ready" : "Your care plan is ready";
  const title = isSalonBooking ? "Confirm your" : isTelehealth ? "Prepare for your" : "Unlock your";
  const titleEmphasis = isSalonBooking ? "care." : isTelehealth ? "conversation." : "next step.";
  const description = isSalonBooking
    ? "Review your appointment details, then complete the deposit securely through Quickteller."
    : isTelehealth
      ? "Review your specialist session, then complete payment securely through Quickteller."
      : "Your scan is saved. Complete this secure payment to unlock your analysis and care notes.";

  return (
    <div className="min-h-screen bg-[#f8f3ec] text-[#3b271b]">
      <Navbar />
      <main className="payment-page-shell">
        <div className="payment-page-container">
          <button type="button" className="payment-back-link" onClick={() => navigate(isSalonBooking ? "/salon-booking" : isTelehealth ? "/consultation" : "/scan")}>
            <ArrowLeft className="h-4 w-4" /> Back to {isSalonBooking ? "booking" : isTelehealth ? "consultation" : "scan"}
          </button>

          <div className="payment-page-heading">
            <span className="payment-eyebrow"><CreditCard className="h-3.5 w-3.5" /> IMSTEV payment</span>
            <h1>{title} <em>{titleEmphasis}</em></h1>
            <p>{description}</p>
          </div>

          {pendingPayment ? (
            <div className="payment-page-grid">
              <section className="payment-order-card">
                <div className="payment-card-kicker"><CheckCircle2 className="h-4 w-4" /> {journeyLabel}</div>
                <h2>{isSalonBooking ? <>One thoughtful step<br /><em>to go.</em></> : isTelehealth ? <>A calmer next step<br /><em>starts here.</em></> : <>Your results,<br /><em>made clear.</em></>}</h2>
                <p className="payment-order-copy">{isSalonBooking || isTelehealth ? description : "We’ll connect your payment to the scan you just completed, then guide you to your results."}</p>
                <div className="payment-detail-list">
                  {isSalonBooking ? (
                    <>
                      <div className="payment-detail-row"><CalendarDays className="h-4 w-4" /><span><small>Date</small><strong>{pendingPayment.appointmentDate}</strong></span></div>
                      <div className="payment-detail-row"><Clock3 className="h-4 w-4" /><span><small>Time</small><strong>{formatTime12Hour(pendingPayment.timeSlot || "")}</strong></span></div>
                      <div className="payment-detail-row"><CreditCard className="h-4 w-4" /><span><small>Services</small><strong>{pendingPayment.serviceNames?.join(", ")}</strong></span></div>
                    </>
                  ) : isTelehealth ? (
                    <>
                      <div className="payment-detail-row"><ShieldCheck className="h-4 w-4" /><span><small>Specialist</small><strong>{pendingPayment.clinicianName || "IMSTEV specialist"}</strong></span></div>
                      <div className="payment-detail-row"><CalendarDays className="h-4 w-4" /><span><small>Date</small><strong>{pendingPayment.appointmentDate}</strong></span></div>
                      <div className="payment-detail-row"><Clock3 className="h-4 w-4" /><span><small>Time</small><strong>{formatTime12Hour(pendingPayment.timeSlot || "")}</strong></span></div>
                    </>
                  ) : (
                    <>
                      <div className="payment-detail-row"><CalendarDays className="h-4 w-4" /><span><small>Care journey</small><strong>{pendingPayment.description || (isSubscription ? "Monthly scan plan" : "Scan analysis")}</strong></span></div>
                      <div className="payment-detail-row"><CheckCircle2 className="h-4 w-4" /><span><small>Included</small><strong>{isSubscription ? "Four scans every 30 days" : "One complete analysis and care guide"}</strong></span></div>
                    </>
                  )}
                </div>
                <div className="payment-trust-note"><ShieldCheck className="h-5 w-5" /><span><strong>Protected checkout</strong><small>Your payment is handled by Interswitch Quickteller.</small></span></div>
              </section>

              <section className="payment-checkout-card">
                <div className="payment-checkout-header"><span>{isSalonBooking ? "Deposit due" : isTelehealth ? "Session fee" : "Amount due"}</span><strong>₦{pendingPayment.amount.toLocaleString("en-NG")}</strong></div>
                {pendingPayment.customerPhone ? (
                  <QuicktellerCheckout
                    amount={pendingPayment.amount}
                    customerName={pendingPayment.customerName}
                    customerEmail={pendingPayment.customerEmail}
                    customerPhone={pendingPayment.customerPhone}
                    description={pendingPayment.description || (isSalonBooking ? `Salon Booking - ${pendingPayment.serviceNames?.join(", ") || "Appointment"}` : isTelehealth ? "IMSTEV specialist consultation" : "IMSTEV NATURALS Scan Analysis")}
                    paymentType={pendingPayment.paymentType}
                    planId={pendingPayment.planId}
                    scanId={pendingPayment.scanId}
                    metadata={{ source: isSalonBooking ? "salon_booking_flow" : isTelehealth ? "telehealth_flow" : "scan_flow", scanId: pendingPayment.scanId, paymentOption: pendingPayment.paymentType }}
                    redirectPath="/payment-callback"
                    onPaymentSuccess={handlePaymentSuccess}
                    onDismiss={() => navigate(isSalonBooking ? "/salon-booking" : isTelehealth ? "/consultation" : "/scan")}
                  />
                ) : (
                  <PhoneNumberPrompt
                    isOpen
                    onClose={() => navigate(isSalonBooking ? "/salon-booking" : isTelehealth ? "/consultation" : "/scan")}
                    onSaved={handlePaymentPhoneSaved}
                  />
                )}
              </section>
            </div>
          ) : (
            <section className="payment-empty-state">
              <CreditCard className="h-10 w-10" />
              <h2>No payment is waiting for you.</h2>
              <p>Start a scan or choose a salon service first, then we’ll bring you here to complete your payment.</p>
              <Button type="button" onClick={() => navigate("/scan")} className="dashboard-primary-button">Return to care</Button>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
