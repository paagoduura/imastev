import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar as CalendarIcon, Clock, ThumbsUp, Video, Loader2, ChevronRight, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { VideoCall } from "@/components/telehealth/VideoCall";
import { QuicktellerCheckout } from "@/components/checkout/QuicktellerCheckout";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { API_BASE } from "@/lib/config";

interface Clinician {
  id: string;
  user_id: string;
  specialty: string;
  bio: string;
  consultation_fee_ngn: number;
  rating: number;
  total_consultations: number;
  years_experience: number;
  availability: any;
  profiles: any;
  full_name?: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  duration_minutes: number;
  meeting_url: string | null;
  notes: string | null;
  clinicians: any;
}

export default function Consultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationType = searchParams.get('type');
  const isDermatology = consultationType === 'dermatology';
  const isTrichology = consultationType === 'trichology';
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [booking, setBooking] = useState(false);
  const [activeCall, setActiveCall] = useState<{ meetingUrl: string; token: string } | null>(null);
  const [joiningCall, setJoiningCall] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const curatedClinicians: Clinician[] = [
        {
          id: "clinician-ngozi",
          user_id: "clinician-ngozi",
          specialty: "Dermatology",
          bio: "Board-certified dermatologist specializing in skin health, acne management, and preventive care.",
          consultation_fee_ngn: 2000,
          rating: 4.75,
          total_consultations: 102,
          years_experience: 13,
          availability: null,
          profiles: { full_name: "Dr Ngozi Eze" },
          full_name: "Dr Ngozi Eze",
        },
        {
          id: "clinician-imakiloye",
          user_id: "clinician-imakiloye",
          specialty: "Trichology",
          bio: "Hair and scalp specialist focused on growth restoration, protective care, and scalp treatments.",
          consultation_fee_ngn: 2000,
          rating: 4.5,
          total_consultations: 82,
          years_experience: 12,
          availability: null,
          profiles: { full_name: "Imakiloye S. Bariduura" },
          full_name: "Imakiloye Stephen Bariduura",
        },
      ];

      const filteredClinicians = consultationType === 'dermatology'
        ? curatedClinicians.filter((c) => c.specialty.toLowerCase().includes('dermatolog'))
        : consultationType === 'trichology'
          ? curatedClinicians.filter((c) => c.specialty.toLowerCase().includes('tricholog'))
          : curatedClinicians;

      setClinicians(filteredClinicians);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          clinicians (
            profiles!clinicians_user_id_fkey (full_name),
            specialty
          )
        `)
        .eq("patient_user_id", user.id)
        .order("scheduled_at", { ascending: false });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateCheckoutInfo = () => {
    if (!customerName.trim()) {
      toast({ title: "Missing name", description: "Please enter your full name", variant: "destructive" });
      return false;
    }
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return false;
    }
    if (!customerPhone.trim() || !/^(\+234|0)[0-9]{10}$/.test(customerPhone.replace(/\s/g, ""))) {
      toast({ title: "Invalid phone", description: "Please enter a valid Nigerian phone number", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleBookAppointment = async () => {
    if (!selectedClinician || !selectedDate || !selectedTime) {
      toast({ title: "Missing information", description: "Please select a clinician, date, and time", variant: "destructive" });
      return;
    }

    if (bookingStep === 1) { setBookingStep(2); return; }
    if (bookingStep === 2) {
      if (!validateCheckoutInfo()) return;
      
      // Format phone number: convert 234 to 0 if needed
      let formattedPhone = customerPhone;
      if (formattedPhone.startsWith('234')) {
        formattedPhone = '0' + formattedPhone.slice(3);
      }
      
      // Set payment data and show modal instead of making the payment call
      setPaymentData({
        amount: selectedClinician.consultation_fee_ngn,
        customerName,
        customerEmail,
        customerPhone: formattedPhone,
        description: `Consultation: ${selectedClinician.profiles?.full_name || selectedClinician.full_name}`,
      });
      // Store appointment data for later processing
      sessionStorage.setItem('pendingAppointment', JSON.stringify({
        clinician_id: selectedClinician.id,
        scheduled_at: new Date(selectedDate).toISOString(),
        duration_minutes: 30,
        notes: `Name: ${customerName}, Email: ${customerEmail}, Phone: ${customerPhone}`
      }));
      sessionStorage.setItem('pendingPaymentType', 'telehealth');
      setShowPaymentModal(true);
      
      // Close the booking dialog by resetting UI states
      setSelectedClinician(null);
      setBookingStep(1);
      return;
    }
  };

  const handlePaymentSuccess = (transactionRef: string) => {
    setShowPaymentModal(false);
    navigate(`/payment-callback?txnref=${encodeURIComponent(transactionRef)}`);
  };

  const joinAppointmentCall = async (appointmentId: string) => {
    setJoiningCall(appointmentId);
    try {
      const token = localStorage.getItem('glowsense_token');
      const response = await fetch(`${API_BASE}/appointments/${appointmentId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to join appointment');
      const data = await response.json();
      setActiveCall({ meetingUrl: data.meeting_url, token: data.token });
    } catch (error: any) {
      toast({ title: "Failed to join call", description: error.message, variant: "destructive" });
    } finally {
      setJoiningCall(null);
    }
  };

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="gradient-mesh">
        <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl transition-all ${showPaymentModal ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent mb-2">
              {isDermatology
                ? 'IMSTEV NATURALS Dermatology Consultations'
                : isTrichology
                  ? 'IMSTEV NATURALS Trichology Consultations'
                  : 'IMSTEV NATURALS Consultations'}
            </h1>
            <p className="text-muted-foreground">
              {isDermatology
                ? 'Connect with certified dermatologists for professional skin care consultations.'
                : isTrichology
                  ? 'Book a consultation with our expert trichologists for professional hair and scalp care.'
                  : 'Book a consultation with our certified dermatologists and trichologists.'
              }
            </p>
          </div>

          <Tabs defaultValue="clinicians" className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="clinicians" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                {isDermatology ? 'Our Dermatologists' : isTrichology ? 'Our Trichologists' : 'Our Specialists'}
              </TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                My Appointments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clinicians" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clinicians.map((clinician) => (
                  <Card key={clinician.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${clinician.profiles?.full_name || clinician.full_name}`} />
                            <AvatarFallback className="text-xs">
                              {(clinician.profiles?.full_name || clinician.full_name)?.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{clinician.profiles?.full_name || clinician.full_name}</CardTitle>
                            <CardDescription className="text-sm">{clinician.specialty}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                            <ThumbsUp className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-bold text-yellow-700">{clinician.rating}</span>
                            <span className="text-xs text-yellow-600">({clinician.total_consultations})</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">{clinician.years_experience} yrs exp.</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">{clinician.bio}</p>
                      <div className="flex items-center justify-between">
                       
                        <Badge variant="secondary">₦{clinician.consultation_fee_ngn.toLocaleString()}</Badge>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white"
                            onClick={() => { setSelectedClinician(clinician); setBookingStep(1); }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Book Appointment
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">
                              Book Appointment with {clinician.profiles?.full_name || clinician.full_name}
                            </DialogTitle>
                            <DialogDescription>
                              {bookingStep === 1 ? "Select your preferred date and time" : "Enter your contact information"}
                            </DialogDescription>
                          </DialogHeader>

                          {bookingStep === 1 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-1 flex justify-center">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  disabled={(date) => date < new Date() || date.getDay() === 0}
                                  className="rounded-md border"
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-4">
                                <div>
                                  <h4 className="font-medium mb-3 text-base">Available Time Slots</h4>
                                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-80 overflow-y-auto">
                                    {timeSlots.map((time) => (
                                      <Button
                                        key={time}
                                        variant={selectedTime === time ? "default" : "outline"}
                                        size="sm"
                                        className="text-sm px-3"
                                        onClick={() => setSelectedTime(time)}
                                      >
                                        {time}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                                  <p className="text-sm text-purple-900 font-medium">Consultation Fee:</p>
                                  <p className="text-3xl font-bold text-purple-700">₦{selectedClinician?.consultation_fee_ngn.toLocaleString()}</p>
                                </div>
                                <Button
                                  className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white h-11 text-base font-medium"
                                  disabled={!selectedDate || !selectedTime}
                                  onClick={handleBookAppointment}
                                >
                                  Next: Enter Details
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : bookingStep === 2 && !showPaymentModal ? (
                            <div className="space-y-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="name" className="text-sm font-medium mb-2 block">Full Name *</Label>
                                  <Input
                                    id="name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Your full name"
                                    className="h-11 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email *</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="h-11 rounded-lg"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">Phone Number *</Label>
                                <Input
                                  id="phone"
                                  value={customerPhone}
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="+234 903 350 5038"
                                  className="h-11 rounded-lg"
                                />
                                <p className="text-xs text-slate-500 mt-1">Format: +234 or 0 followed by 10 digits</p>
                              </div>
                              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                                <p className="text-sm font-medium text-amber-900">Consultation Fee:</p>
                                <p className="text-3xl font-bold text-amber-700">₦{selectedClinician?.consultation_fee_ngn.toLocaleString()}</p>
                              </div>
                              <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 h-11" onClick={() => setBookingStep(1)} disabled={booking}>
                                  Back
                                </Button>
                                <Button
                                  className="flex-1 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white h-11 font-medium"
                                  disabled={booking}
                                  onClick={handleBookAppointment}
                                >
                                  Next: Proceed to Payment
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4">
              {appointments.length === 0 ? (
                <Card className="text-center p-8 sm:p-12">
                  <CalendarIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No appointments yet</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">Book your first consultation to get started</p>
                </Card>
              ) : (
                appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${appointment.clinicians?.profiles?.full_name}`} />
                              <AvatarFallback className="text-xs sm:text-sm">
                                {appointment.clinicians?.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base truncate">{appointment.clinicians?.profiles?.full_name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">{appointment.clinicians?.specialty}</p>
                            </div>
                            <Badge
                              className="sm:hidden"
                              variant={appointment.status === "confirmed" ? "default" : appointment.status === "completed" ? "secondary" : "outline"}
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "PP")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "p")}
                            </div>
                          </div>
                          {appointment.notes && (
                            <p className="text-xs sm:text-sm mt-2 text-muted-foreground">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                          <Badge
                            className="hidden sm:inline-flex"
                            variant={appointment.status === "confirmed" ? "default" : appointment.status === "completed" ? "secondary" : "outline"}
                          >
                            {appointment.status}
                          </Badge>
                          {appointment.meeting_url && (appointment.status === "confirmed" || appointment.status === "scheduled") && (
                            <Button
                              size="sm"
                              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white"
                              onClick={() => joinAppointmentCall(appointment.id)}
                              disabled={joiningCall === appointment.id}
                            >
                              {joiningCall === appointment.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Video className="mr-2 h-4 w-4" />
                              )}
                              Join Meeting
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {activeCall && (
        <VideoCall
          meetingUrl={activeCall.meetingUrl}
          token={activeCall.token}
          onLeave={() => setActiveCall(null)}
        />
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md p-0 border-0">
          <DialogHeader className="hidden" />
          {paymentData && (
            <QuicktellerCheckout
              amount={paymentData.amount}
              customerName={paymentData.customerName}
              customerEmail={paymentData.customerEmail}
              customerPhone={paymentData.customerPhone}
              description={paymentData.description}
              onPaymentSuccess={handlePaymentSuccess}
              onDismiss={() => setShowPaymentModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
