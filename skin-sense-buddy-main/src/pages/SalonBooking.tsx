import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { QuicktellerCheckout } from "@/components/checkout/QuicktellerCheckout";
import { 
  Scissors, Clock, Calendar as CalendarIcon, Check, 
  ChevronRight, User, Phone, Mail, Crown, Sparkles, 
  CheckCircle2, ArrowLeft, Timer, MapPin, Loader2, X
} from "lucide-react";
import { format, addDays, isBefore, startOfToday, isToday } from "date-fns";
import { API_BASE } from "@/lib/config";
import { fallbackSalonServices } from "@/lib/fallbackSalonServices";

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  priceMax?: number;
}

interface BookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceIds: string[];
  appointmentDate: string;
  timeSlot: string;
  notes: string;
}

const isSalonClosedDay = (date: Date) => date.getDay() === 1;

export default function SalonBooking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const [formData, setFormData] = useState<BookingData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceIds: [],
    appointmentDate: "",
    timeSlot: "",
    notes: ""
  });


  useEffect(() => {
    loadServices();
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const checkAuth = async () => {
    const token = localStorage.getItem('glowsense_token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE}/auth/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          setUserProfile(data.user);
          const profileRes = await fetch(`${API_BASE}/profiles`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile) {
              setFormData(prev => ({
                ...prev,
                customerName: profile.full_name || "",
                customerEmail: data.user.email || "",
                customerPhone: profile.phone || ""
              }));
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/salon/services`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
          return;
        }
      }
      setServices(fallbackSalonServices);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices(fallbackSalonServices);
    } finally {
      setServicesLoading(false);
    }
  };

  const loadAvailableSlots = async (date: Date) => {
    setSlotsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`${API_BASE}/salon/available-slots?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots);
        setBookedSlots(data.bookedSlots);
      }
    } catch (error) {
      console.error('Failed to load slots:', error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleServiceToggle = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((item) => item.id === service.id);
      const next = exists
        ? prev.filter((item) => item.id !== service.id)
        : [...prev, service];
      setFormData((current) => ({ ...current, serviceIds: next.map((item) => item.id) }));
      return next;
    });
  };

  const continueToSchedule = () => {
    if (!selectedServices.length) {
      toast({
        title: "Select Services",
        description: "Choose at least one service before continuing.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const removeSelectedService = (serviceIdToRemove: string) => {
    setSelectedServices((prev) => {
      const next = prev.filter((service) => service.id !== serviceIdToRemove);
      setFormData((current) => ({ ...current, serviceIds: next.map((service) => service.id) }));
      if (!next.length) {
        setStep(1);
        toast({
          title: "No Services Selected",
          description: "Select at least one service to continue booking.",
        });
      }
      return next;
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, appointmentDate: format(date, 'yyyy-MM-dd') }));
      setSelectedSlot("");
    }
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setFormData(prev => ({ ...prev, timeSlot: slot }));
  };

  const handleBooking = () => {
    if (!formData.customerName || !formData.customerPhone) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and phone number.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedServices.length) {
      toast({
        title: "Missing Services",
        description: "Please select at least one service.",
        variant: "destructive"
      });
      return;
    }

    // Format phone number: convert 234 to 0 if needed
    let formattedPhone = formData.customerPhone;
    if (formattedPhone.startsWith('234')) {
      formattedPhone = '0' + formattedPhone.slice(3);
    }

    const customerEmail = formData.customerEmail || `${formData.customerPhone.replace(/\D/g, '')}@guest.imstevnaturals.com`;
    
    // Calculate 50% of the selected services total as deposit
    const depositAmount = Math.ceil(totalPrice / 2);

    // Store booking data for use after payment
    sessionStorage.setItem('pendingPaymentType', 'salon_booking');
    sessionStorage.setItem('pendingSalonBooking', JSON.stringify({
      formData: {
        ...formData,
        serviceIds: selectedServices.map((service) => service.id),
      },
    }));

    // Show payment modal
    setPaymentData({
      amount: depositAmount,
      customerEmail,
      customerName: formData.customerName,
      customerPhone: formattedPhone,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (transactionRef: string) => {
    setShowPaymentModal(false);
    navigate(`/payment-callback?txnref=${encodeURIComponent(transactionRef)}`);
  };

  const formatPrice = (price: number, priceMax?: number) => {
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    });
    if (priceMax && priceMax > price) {
      return `${formatter.format(price)} - ${formatter.format(priceMax)}`;
    }
    return formatter.format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.duration || 0), 0),
    [selectedServices]
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices]
  );

  const categoryIcons: Record<string, string> = {
    'Hairdo': '💇‍♀️',
    'Colouring': '🎨',
    'Twists': '🌀',
    'Braiding': '🎀',
    'Locs': '✨',
    'Treatment': '🧴',
    'Bonus': '🎁',
    'Consultation': '💬',
    'Premium': '👑'
  };

  if (bookingSuccess && bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-amber-50/20">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
                Booking Confirmed!
              </h1>
              <p className="text-muted-foreground">
                Your deposit has been received. Please pay the balance when you arrive.
              </p>
            </div>

            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-100">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                      <Scissors className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-semibold text-lg">{bookingDetails.service_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="text-sm">Date</span>
                      </div>
                      <p className="font-semibold">
                        {format(new Date(bookingDetails.appointment_date), 'EEEE, MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Time</span>
                      </div>
                      <p className="font-semibold">{bookingDetails.time_slot}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Service Total</span>
                      <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                        {formatPrice(bookingDetails.price_ngn)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Deposit Paid (50%)</span>
                      <span className="text-xl font-bold text-amber-700">
                        {formatPrice(Math.ceil(bookingDetails.price_ngn / 2))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Balance Due at Appointment</span>
                      <span className="text-xl font-bold text-purple-700">
                        {formatPrice(Math.max(bookingDetails.price_ngn - Math.ceil(bookingDetails.price_ngn / 2), 0))}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-900">IMSTEV NATURALS Hair Specialist Salon</span>
                    </div>
                    <p className="text-sm text-purple-700">40 Law School Road, Opp FirstBank, Bwari, Abuja</p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-lg font-semibold"
                    >
                      Go to Dashboard
                    </Button>
                    <Button 
                      onClick={() => {
                        setBookingSuccess(false);
                        setStep(1);
                        setSelectedServices([]);
                        setFormData((prev) => ({ ...prev, serviceIds: [] }));
                        setSelectedDate(undefined);
                        setSelectedSlot("");
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                    >
                      Book Another Appointment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-amber-50/20">
      <Navbar />
      
      <div className={`pt-24 pb-16 transition-all ${showPaymentModal ? 'pointer-events-none opacity-50' : ''}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Premium Salon Experience
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
                Book Your <span className="bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">Appointment</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience world-class hair care at IMSTEV NATURALS Hair Specialist Salon
              </p>
            </div>

            {isLoggedIn && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-purple-200/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-purple-900">Priority Booking Active</p>
                  <p className="text-sm text-muted-foreground">As a registered member, you get access to priority time slots</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      step >= s 
                        ? 'bg-gradient-to-br from-purple-600 to-amber-500 text-white shadow-lg shadow-purple-500/30' 
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-12 sm:w-20 h-1 mx-2 rounded-full transition-all duration-300 ${
                      step > s ? 'bg-gradient-to-r from-purple-500 to-amber-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 mb-8 text-sm">
              <span className={step >= 1 ? 'text-purple-700 font-medium' : 'text-muted-foreground'}>Service</span>
              <span className={step >= 2 ? 'text-purple-700 font-medium' : 'text-muted-foreground'}>Date & Time</span>
              <span className={step >= 3 ? 'text-purple-700 font-medium' : 'text-muted-foreground'}>Your Details</span>
            </div>

            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-2xl font-display font-bold mb-2">Choose Your Service</h2>
                  <p className="text-muted-foreground">Select one or more services before choosing date and time</p>
                </div>

                {servicesLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-purple-100 bg-white/80 p-10 text-muted-foreground">
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Loading services...
                  </div>
                ) : (
                  <>
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{categoryIcons[category] || '✨'}</span>
                      <h3 className="text-lg font-semibold text-foreground">{category}</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryServices.map((service) => (
                        <Card 
                          key={service.id}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${
                            selectedServices.some((item) => item.id === service.id)
                              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20' 
                              : 'border-transparent hover:border-purple-200'
                          }`}
                          onClick={() => handleServiceToggle(service)}
                        >
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-foreground">{service.name}</h4>
                              {selectedServices.some((item) => item.id === service.id) && (
                                <Badge className="bg-purple-600 text-white">Selected</Badge>
                              )}
                              {category === 'Premium' && (
                                <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Timer className="w-4 h-4" />
                                <span className="text-sm">{formatDuration(service.duration)}</span>
                              </div>
                              <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                                {formatPrice(service.price, service.priceMax)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 p-4">
                  <div>
                    <p className="font-medium text-purple-900">
                      {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} selected
                    </p>
                    <p className="text-sm text-purple-700">
                      Total duration: {formatDuration(totalDuration)} • Total: {formatPrice(totalPrice)}
                    </p>
                  </div>
                  <Button
                    onClick={continueToSchedule}
                    disabled={!selectedServices.length}
                    className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(1)}
                  className="mb-6 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Services
                </Button>

                {selectedServices.length > 0 && (
                  <div className="mb-4 rounded-xl border border-purple-100 bg-white p-4">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">Selected services (tap x to remove):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map((service) => (
                        <Badge
                          key={`chip-${service.id}`}
                          variant="secondary"
                          className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-800"
                        >
                          <span>{service.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedService(service.id)}
                            className="rounded-full p-0.5 text-purple-700 transition-colors hover:bg-purple-200"
                            aria-label={`Remove ${service.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedServices.length > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-100 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} selected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedServices.map((service) => service.name).join(", ")}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDuration(totalDuration)} • {formatPrice(totalPrice)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                      Change
                    </Button>
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-purple-600" />
                        Select Date
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => 
                          isBefore(date, startOfToday()) || 
                          isSalonClosedDay(date) ||
                          isBefore(addDays(new Date(), 60), date)
                        }
                        className="rounded-xl border shadow-sm"
                      />
                      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-300" />
                          <span>Unavailable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <span>Selected</span>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
                        Monday is closed. Tuesday to Saturday and Sunday appointments start from 2:00 PM.
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        Select Time
                        {selectedDate && (
                          <Badge variant="outline" className="ml-auto">
                            {format(selectedDate, 'MMM d')}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedDate ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>Please select a date first</p>
                        </div>
                      ) : slotsLoading ? (
                        <div className="text-center py-12">
                          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-muted-foreground">Loading available times...</p>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="font-medium">No available slots</p>
                          <p className="text-sm">Please select a different date</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {isLoggedIn && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                              <div className="flex items-center gap-2 text-amber-700 font-medium">
                                <Crown className="w-4 h-4" />
                                Priority slots highlighted for you
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableSlots.map((slot, index) => {
                              const isPriority = isLoggedIn && index < 6;
                              return (
                                <Button
                                  key={slot}
                                  variant={selectedSlot === slot ? "default" : "outline"}
                                  size="sm"
                                  className={`relative ${
                                    selectedSlot === slot 
                                      ? 'bg-gradient-to-r from-purple-600 to-amber-500 text-white border-0' 
                                      : isPriority 
                                        ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' 
                                        : ''
                                  }`}
                                  onClick={() => handleSlotSelect(slot)}
                                >
                                  {slot}
                                  {isPriority && selectedSlot !== slot && (
                                    <Crown className="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    disabled={!selectedDate || !selectedSlot}
                    onClick={() => setStep(3)}
                    className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 px-8"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(2)}
                  className="mb-6 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Date & Time
                </Button>

                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <Card className="border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5 text-purple-600" />
                          Your Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {!isLoggedIn && (
                          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                            <p className="text-sm text-purple-700 mb-3">
                              <strong>Already have an account?</strong> Sign in for priority booking and to track your appointments.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate('/auth')}
                              className="border-purple-300 text-purple-700 hover:bg-purple-100"
                            >
                              Sign In
                            </Button>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              Full Name *
                            </Label>
                            <Input
                              id="name"
                              placeholder="Enter your full name"
                              value={formData.customerName}
                              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                              className="h-12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              Phone Number *
                            </Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="e.g., 08012345678"
                              value={formData.customerPhone}
                              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                              className="h-12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              Email (Optional)
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@email.com"
                              value={formData.customerEmail}
                              onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                              className="h-12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes">Special Requests (Optional)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Any special requests or notes for your stylist..."
                              value={formData.notes}
                              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card className="border-0 shadow-xl sticky top-24">
                      <CardHeader className="bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-t-xl">
                        <CardTitle className="text-lg">Booking Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Services</span>
                            <span className="font-medium text-right">
                              {selectedServices.length} item{selectedServices.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{formatDuration(totalDuration)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-medium">{selectedDate && format(selectedDate, 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-medium">{selectedSlot}</span>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          {!!selectedServices.length && (
                            <div className="mb-3 space-y-1 text-sm">
                              {selectedServices.map((service) => (
                                <div key={service.id} className="flex items-center justify-between">
                                  <span className="text-muted-foreground">{service.name}</span>
                                  <span>{formatPrice(service.price, service.priceMax)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total</span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                              {formatPrice(totalPrice)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deposit required to confirm booking
                          </p>
                        </div>

                        <Button
                          className="w-full font-semibold bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                          onClick={handleBooking}
                          disabled={!formData.customerName || !formData.customerPhone || !selectedServices.length}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Pay & Confirm
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          50% upfront to confirm. Balance due at your appointment.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 flex justify-between items-center">
              <h2 className="text-lg font-bold">Complete Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <QuicktellerCheckout
                amount={paymentData.amount}
                customerName={paymentData.customerName}
                customerEmail={paymentData.customerEmail}
                customerPhone={paymentData.customerPhone}
                description={`Salon Booking - ${selectedServices.map((service) => service.name).join(", ")}`}
                onPaymentSuccess={handlePaymentSuccess}
                onDismiss={() => setShowPaymentModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
