import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Scissors, Clock, MapPin, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function Telehealth() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="gradient-mesh">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl">
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
              IMSTEV NATURALS Hair Specialist Salon
            </h1>
            <p className="text-muted-foreground">
              Book an appointment at our premium hair specialist salon and experience world-class natural hair care.
            </p>
          </div>

          {/* Main booking card */}
          <Card className="border-none bg-white/80 dark:bg-slate-900/70 shadow-lg mb-6">
            <CardContent className="p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Scissors className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-semibold">Book a Salon Appointment</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Choose your service, pick a date and time, and confirm with a deposit.
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => navigate("/salon-booking")}
                  className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-lg shadow-purple-500/25 px-8 whitespace-nowrap"
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card className="border-none bg-white/60 dark:bg-slate-900/50 shadow-sm">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Opening Hours</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Monday – Saturday</p>
                  <p className="text-xs text-muted-foreground">9:00 AM – 7:00 PM</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/60 dark:bg-slate-900/50 shadow-sm">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Location</p>
                  <p className="text-xs text-muted-foreground mt-0.5">40 Law School Road</p>
                  <p className="text-xs text-muted-foreground">Opp FirstBank, Bwari, Abuja</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/60 dark:bg-slate-900/50 shadow-sm">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Speciality</p>
                  <p className="text-xs text-muted-foreground mt-0.5">4A–4C Natural Hair</p>
                  <p className="text-xs text-muted-foreground">Locs, Braids & Treatments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How it works */}
          <Card className="border-none bg-white/80 dark:bg-slate-900/70 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h3 className="font-display font-semibold text-lg mb-5">How Booking Works</h3>
              <div className="space-y-4">
                {[
                  { step: "1", title: "Choose Your Service", desc: "Browse our full range of hair services and select what you need." },
                  { step: "2", title: "Pick a Date & Time", desc: "Select an available slot that works for your schedule." },
                  { step: "3", title: "Pay a Small Deposit", desc: "Confirm your booking with a ₦1,000 deposit. Balance is paid at the salon." },
                  { step: "4", title: "Visit the Salon", desc: "Come in on your scheduled date and enjoy premium hair care." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => navigate("/salon-booking")}
                className="w-full mt-8 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-lg shadow-purple-500/20"
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                Book Appointment Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
