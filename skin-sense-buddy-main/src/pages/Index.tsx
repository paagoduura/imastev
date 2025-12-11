import { Button } from "@/components/ui/button";
import { Camera, Sparkles, TrendingUp, Shield, Users, Star, ChevronRight, Heart, Zap, CheckCircle2, ArrowRight, Video, ShoppingBag, Calendar, Scissors, Leaf, MapPin, Clock, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-soft animate-delay-300" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 relative">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 animate-fade-in">
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Clinical-Grade AI Analysis</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-[1.1] tracking-tight animate-fade-in-up">
                  Your Hair & Skin's
                  <span className="block text-gradient-premium mt-2">
                    Personal AI Expert
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up animate-delay-100">
                  Get instant, accurate hair and skin analysis powered by medical-grade AI. 
                  <span className="font-semibold text-slate-800 dark:text-white"> Specialized expertise for 4A-4C hair types</span> with personalized treatment plans.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animate-delay-200">
                  <Button 
                    size="lg" 
                    className="btn-premium text-base sm:text-lg px-8 py-6 h-auto"
                    onClick={() => navigate('/scan')}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Start Free Scan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-base sm:text-lg px-8 py-6 h-auto rounded-xl"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-4 animate-fade-in-up animate-delay-300">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex -space-x-2">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{['A','B','C','D'][i-1]}</span>
                        </div>
                      ))}
                    </div>
                    <span className="font-medium">100K+ Users</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1">4.9/5</span>
                  </div>
                </div>
              </div>

              <div className="relative animate-fade-in animate-delay-200 mt-8 lg:mt-0">
                <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-[1.5rem] sm:rounded-[2rem] rotate-3 opacity-20 blur-2xl scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400/30 to-emerald-400/30 rounded-[1.5rem] sm:rounded-[2rem] -rotate-2 scale-102" />
                  
                  <div className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl shadow-teal-500/30 border-2 sm:border-4 border-white/20 backdrop-blur-sm">
                    <img 
                      src="/hero-image.jpg" 
                      alt="Hair Analysis Preview" 
                      className="w-full h-auto object-cover aspect-[4/5]"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    
                    <div 
                      className="absolute top-[20%] left-[20%] sm:left-[25%] w-20 h-20 sm:w-28 sm:h-28 rounded-full animate-float"
                      style={{ animation: 'float 4s ease-in-out infinite' }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md border-2 border-white/50 shadow-2xl shadow-black/20" />
                      <div className="absolute inset-1 rounded-full border border-white/30" />
                      <div className="absolute inset-2 rounded-full border border-white/20" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20" />
                      <div className="absolute top-2 left-3 w-4 h-4 rounded-full bg-white/60 blur-sm" />
                      <div className="absolute top-4 left-5 w-2 h-2 rounded-full bg-white/80" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[8px] sm:text-[10px] font-bold text-white drop-shadow-lg">4C COILS</div>
                          <div className="text-[6px] sm:text-[8px] text-white/80 drop-shadow">Detected</div>
                        </div>
                      </div>
                      <div className="absolute -inset-1 rounded-full border border-teal-400/50 animate-pulse" />
                    </div>
                    
                    <div 
                      className="absolute bottom-[30%] right-[10%] sm:right-[15%] w-16 h-16 sm:w-24 sm:h-24 rounded-full"
                      style={{ animation: 'float 5s ease-in-out infinite 1s' }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/35 to-white/10 backdrop-blur-md border-2 border-white/40 shadow-xl" />
                      <div className="absolute inset-1 rounded-full border border-white/25" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20" />
                      <div className="absolute top-1.5 left-2.5 w-3 h-3 rounded-full bg-white/50 blur-sm" />
                      <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-white/70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[8px] sm:text-[10px] font-bold text-white drop-shadow-lg">HEALTHY</div>
                          <div className="text-[6px] sm:text-[8px] text-white/80 drop-shadow">Scalp</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl border border-white/20">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-xs sm:text-sm truncate">AI Analysis Complete</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 truncate">4C Natural Hair Detected</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="badge-premium text-[10px] sm:text-xs whitespace-nowrap">98% Match</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          <div className="text-center p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-[10px] sm:text-xs text-slate-500">Porosity</div>
                            <div className="text-xs sm:text-sm font-bold text-teal-600">Normal</div>
                          </div>
                          <div className="text-center p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-[10px] sm:text-xs text-slate-500">Moisture</div>
                            <div className="text-xs sm:text-sm font-bold text-emerald-600">85%</div>
                          </div>
                          <div className="text-center p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-[10px] sm:text-xs text-slate-500">Health</div>
                            <div className="text-xs sm:text-sm font-bold text-amber-600">Great</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-300/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
              <Leaf className="w-4 h-4" />
              100% Organic Products
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              IMSTEV NATURALS <span className="text-gradient-premium">Organic Collection</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Premium handcrafted organic hair care products made with love in Nigeria. Nourish your natural beauty with nature's finest ingredients.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-amber-500/20 rounded-[2.5rem] blur-2xl" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-purple-500/20 border-4 border-white/50 dark:border-purple-900/30">
                <img 
                  src="/imstev-products.jpg" 
                  alt="IMSTEV NATURALS Organic Products" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center shadow-lg">
                        <Leaf className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold">Complete Hair Care Range</p>
                        <p className="text-sm text-slate-500">Shampoo, Conditioner, Oils & More</p>
                      </div>
                      <Button 
                        onClick={() => navigate('/shop')}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                      >
                        Shop Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="grid gap-4">
                {[
                  { name: "Deep Cleanse Shampoo", desc: "African Black Soap with Tea Tree Oil", price: "₦4,500" },
                  { name: "Deep Conditioner", desc: "Protein & Moisture Rich Formula", price: "₦5,200" },
                  { name: "Scalp & Hair Growth Oil", desc: "Argan, Jojoba & Castor Oil Infused", price: "₦3,800" },
                  { name: "Leave-In Conditioner", desc: "Clove Oil & Goat Milk Extract", price: "₦4,000" },
                  { name: "Hair Softening Butter", desc: "For Strong & Healthy Roots", price: "₦3,500" },
                  { name: "Organic Coconut Oil", desc: "Pure Cold-Pressed Formula", price: "₦2,800" }
                ].map((product, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-purple-100 dark:border-purple-900/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">{product.desc}</p>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{product.price}</span>
                  </div>
                ))}
              </div>
              <Button 
                size="lg"
                onClick={() => navigate('/shop')}
                className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-xl shadow-purple-500/25 h-14 text-lg font-semibold rounded-xl"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                View All Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="badge-premium mb-4">Our Services</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              What We Offer
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI-powered analysis to premium salon services and organic products
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="AI Hair Analysis"
              description="Advanced AI technology to analyze your hair type, porosity, and health. Get personalized recommendations for 4A-4C hair types."
              gradient="from-purple-500 to-violet-500"
            />
            <FeatureCard
              icon={<Scissors className="w-6 h-6" />}
              title="Specialist Salon"
              description="Book appointments at our Hair Specialist Salon for professional styling, treatments, and personalized hair care services."
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<Leaf className="w-6 h-6" />}
              title="Organic Products"
              description="Shop our premium range of handcrafted organic hair care products made with natural Nigerian ingredients."
              gradient="from-emerald-500 to-green-500"
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Appointment Booking"
              description="Easy online booking system. Request an appointment and receive a confirmed date for your salon visit."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Your Journey"
              description="Monitor your hair growth and health progress with before/after comparisons and AI-measured tracking."
              gradient="from-teal-500 to-cyan-500"
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Custom Treatments"
              description="Get personalized treatment formulas and regimens based on your AI analysis results and specific hair concerns."
              gradient="from-pink-500 to-rose-500"
            />
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-4 backdrop-blur-sm">
              <Scissors className="w-4 h-4" />
              Hair Specialist Salon
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              IMSTEV NATURALS <span className="text-amber-300">Hair Specialist Salon</span>
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Experience premium hair care services by our expert stylists. Book an appointment today and let us transform your natural beauty.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { img: "/gallery-1.jpg", title: "Protective Styling", tag: "4C Twist Updo" },
                { img: "/gallery-2.jpg", title: "Kids Natural", tag: "Beaded Twists" },
                { img: "/gallery-3.jpg", title: "Cornrow Art", tag: "Flat Twist Style" },
                { img: "/gallery-4.jpg", title: "Loc Maintenance", tag: "Professional Locs" }
              ].map((item, i) => (
                <div key={i} className="group relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl aspect-square cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-amber-800" />
                  <img 
                    src={item.img} 
                    alt={item.title}
                    className="w-full h-full object-cover object-top transition-all duration-500 group-hover:scale-110 relative z-10"
                    style={{ filter: 'contrast(1.05) saturate(1.1)' }}
                  />
                  <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(88,28,135,0.4)_70%,rgba(88,28,135,0.7)_100%)]" />
                  <div className="absolute inset-0 z-20 bg-gradient-to-t from-purple-900/90 via-transparent to-purple-900/30" />
                  <div className="absolute inset-0 z-30 border-2 border-amber-400/30 group-hover:border-amber-400/60 rounded-xl sm:rounded-2xl transition-all duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30">
                    <span className="inline-block px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] sm:text-xs font-semibold rounded-full mb-1 shadow-lg">{item.tag}</span>
                    <p className="text-white font-semibold text-sm sm:text-base drop-shadow-lg">{item.title}</p>
                  </div>
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center z-30 shadow-lg">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white fill-white" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-300" />
                  How Booking Works
                </h3>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Request Appointment", desc: "Fill out our booking form with your preferred dates and services" },
                    { step: "2", title: "Confirmation Call", desc: "Our team will contact you to confirm your appointment slot" },
                    { step: "3", title: "Visit Our Salon", desc: "Come in on your scheduled date and enjoy our premium services" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <p className="text-sm text-white/70">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <Clock className="w-6 h-6 text-amber-300 mx-auto mb-2" />
                  <p className="text-sm text-white/70">Opening Hours</p>
                  <p className="font-semibold text-white">9AM - 7PM</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <Phone className="w-6 h-6 text-amber-300 mx-auto mb-2" />
                  <p className="text-sm text-white/70">Call Us</p>
                  <p className="font-semibold text-white">Contact</p>
                </div>
              </div>

              <Button 
                size="lg"
                onClick={() => navigate('/telehealth')}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xl shadow-amber-500/25 h-14 text-lg font-semibold rounded-xl"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="card-premium p-6 animate-fade-in-up">
                      <Zap className="w-10 h-10 text-amber-500 mb-4" />
                      <h4 className="font-semibold text-2xl">95%</h4>
                      <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                    </div>
                    <div className="card-premium p-6 animate-fade-in-up animate-delay-100">
                      <Users className="w-10 h-10 text-blue-500 mb-4" />
                      <h4 className="font-semibold text-2xl">100K+</h4>
                      <p className="text-sm text-muted-foreground">Happy Users</p>
                    </div>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div className="card-premium p-6 animate-fade-in-up animate-delay-200">
                      <Shield className="w-10 h-10 text-teal-500 mb-4" />
                      <h4 className="font-semibold text-2xl">HIPAA</h4>
                      <p className="text-sm text-muted-foreground">Compliant</p>
                    </div>
                    <div className="card-premium p-6 animate-fade-in-up animate-delay-300">
                      <Star className="w-10 h-10 text-amber-400 mb-4" />
                      <h4 className="font-semibold text-2xl">4.9/5</h4>
                      <p className="text-sm text-muted-foreground">User Rating</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">Why IMSTEV NATURALS?</span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold">
                  Trusted by Thousands for{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">Natural Beauty</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Our AI is trained on diverse datasets specifically including African hair types and skin tones, ensuring accurate analysis for everyone.
                </p>
                <ul className="space-y-4">
                  {[
                    "Expert AI trained for African hair types",
                    "Premium organic products made in Nigeria",
                    "Professional salon with certified stylists",
                    "Personalized hair care recommendations"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  size="lg"
                  onClick={() => navigate('/scan')}
                  className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-lg mt-4"
                >
                  Try It Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-br from-purple-600 via-purple-700 to-amber-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Start Your Natural Beauty Journey
            </h2>
            <p className="text-lg sm:text-xl text-white/80">
              Join thousands who trust IMSTEV NATURALS for their hair care needs. From AI analysis to organic products and expert salon services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => navigate('/scan')}
                className="bg-white text-purple-700 hover:bg-white/90 shadow-xl shadow-black/10 text-lg px-8 py-6 h-auto rounded-xl font-semibold"
              >
                <Camera className="mr-2 h-5 w-5" />
                Get Your Free Analysis
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/telehealth')}
                className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur text-lg px-8 py-6 h-auto rounded-xl"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Salon Appointment
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-100 dark:ring-purple-900/30">
                  <img src="/imstev-logo.png" alt="IMSTEV NATURALS" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-display font-bold text-lg bg-gradient-to-r from-purple-700 to-amber-700 bg-clip-text text-transparent">IMSTEV NATURALS</span>
                  <p className="text-xs text-muted-foreground">Home of Nature's Beauty</p>
                </div>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Organic Products</span>
                <span>Hair Specialist Salon</span>
                <span>AI Analysis</span>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-900/30">
              <p className="text-sm text-muted-foreground text-center">
                <strong className="text-foreground">Disclaimer:</strong> IMSTEV NATURALS AI is a hair care guidance tool and wellness assistant. 
                It is not a substitute for professional medical advice. For serious scalp or skin conditions, please consult a licensed dermatologist.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  gradient: string;
}) => (
  <div className="group card-interactive p-6 sm:p-8">
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-xl font-display font-semibold text-foreground mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export default Index;
