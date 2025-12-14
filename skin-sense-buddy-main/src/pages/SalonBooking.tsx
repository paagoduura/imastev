import { useState, useEffect } from "react";
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
import { 
  Scissors, Clock, Calendar as CalendarIcon, Check, Star, 
  ChevronRight, User, Phone, Mail, Crown, Sparkles, 
  CheckCircle2, ArrowLeft, Timer, MapPin, Loader2
} from "lucide-react";
import { format, addDays, isBefore, startOfToday, isToday } from "date-fns";

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
  serviceId: string;
  appointmentDate: string;
  timeSlot: string;
  notes: string;
}

const API_BASE = '/api';

export default function SalonBooking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const [formData, setFormData] = useState<BookingData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
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
    try {
      const response = await fetch(`${API_BASE}/salon/services`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
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

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setFormData(prev => ({ ...prev, serviceId: service.id }));
    setStep(2);
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

  const handleBooking = async () => {
    if (!formData.customerName || !formData.customerPhone) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and phone number.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('glowsense_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/salon/book`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setBookingDetails(data.booking);
        setBookingSuccess(true);
        toast({
          title: "Booking Confirmed!",
          description: "Your appointment has been successfully booked.",
        });
      } else {
        toast({
          title: "Booking Failed",
          description: data.error || "Unable to complete booking. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
                Your appointment has been successfully scheduled
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

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                        {formatPrice(bookingDetails.price_ngn)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Pay now online or pay at the salon</p>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-900">IMSTEV NATURALS Hair Specialist Salon</span>
                    </div>
                    <p className="text-sm text-purple-700">Lagos, Nigeria</p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      onClick={async () => {
                        setPaymentLoading(true);
                        try {
                          const customerEmail = bookingDetails.customer_email || formData.customerEmail || `${bookingDetails.customer_phone.replace(/\D/g, '')}@guest.imstevnaturals.com`;
                          
                          console.log('Initializing payment with:', {
                            amount: bookingDetails.price_ngn,
                            customerEmail,
                            customerName: bookingDetails.customer_name,
                            customerPhone: bookingDetails.customer_phone,
                            bookingId: bookingDetails.id,
                          });
                          
                          const response = await fetch(`${API_BASE}/payment/initialize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount: bookingDetails.price_ngn,
                              customerEmail,
                              customerName: bookingDetails.customer_name,
                              customerPhone: bookingDetails.customer_phone,
                              description: `Salon Booking: ${bookingDetails.service_name}`,
                              bookingId: bookingDetails.id,
                            }),
                          });
                          
                          const data = await response.json();
                          console.log('Payment response:', data);
                          
                          if (data.success && data.paymentUrl) {
                            console.log('Redirecting to:', data.paymentUrl);
                            window.location.href = data.paymentUrl;
                          } else {
                            setPaymentLoading(false);
                            toast({
                              title: "Payment Error",
                              description: data.error || "Unable to initialize payment",
                              variant: "destructive"
                            });
                          }
                        } catch (error: any) {
                          console.error('Payment error:', error);
                          setPaymentLoading(false);
                          toast({
                            title: "Error",
                            description: error.message || "Could not connect to payment service",
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={paymentLoading}
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-lg font-semibold disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Connecting to Payment...
                        </>
                      ) : (
                        `Pay Now - ${formatPrice(bookingDetails.price_ngn)}`
                      )}
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={() => navigate('/')}
                        variant="outline"
                        className="flex-1"
                      >
                        Pay at Salon Instead
                      </Button>
                      <Button 
                        onClick={() => {
                          setBookingSuccess(false);
                          setStep(1);
                          setSelectedService(null);
                          setSelectedDate(undefined);
                          setSelectedSlot("");
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600"
                      >
                        Book Another Appointment
                      </Button>
                    </div>
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
      
      <div className="pt-24 pb-16">
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
                  <p className="text-muted-foreground">Select the service you'd like to book</p>
                </div>

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
                            selectedService?.id === service.id 
                              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20' 
                              : 'border-transparent hover:border-purple-200'
                          }`}
                          onClick={() => handleServiceSelect(service)}
                        >
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-foreground">{service.name}</h4>
                              {category === 'Premium' && (
                                <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                                  <Star className="w-3 h-3 mr-1" />
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

                {selectedService && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-100 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedService.name}</p>
                        <p className="text-sm text-muted-foreground">{formatDuration(selectedService.duration)} • {formatPrice(selectedService.price, selectedService.priceMax)}</p>
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
                          date.getDay() === 0 ||
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
                                    <Star className="w-3 h-3 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
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
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-medium text-right">{selectedService?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{selectedService && formatDuration(selectedService.duration)}</span>
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
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Total</span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                              {selectedService && formatPrice(selectedService.price, selectedService.priceMax)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{selectedService?.priceMax ? 'Final price depends on hair length/complexity • ' : ''}Pay at the salon</p>
                        </div>

                        <Button
                          className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-lg font-semibold"
                          onClick={handleBooking}
                          disabled={loading || !formData.customerName || !formData.customerPhone}
                        >
                          {loading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Booking...
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5 mr-2" />
                              Confirm Booking
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          By booking, you agree to our cancellation policy
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
      
      <Footer />
    </div>
  );
}
