import { Button } from "@/components/ui/button";
import { Camera, Sparkles, TrendingUp, Shield, Users, Star, ChevronRight, Heart, Zap, CheckCircle2, ArrowRight, Video, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";

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

              <div className="relative hidden lg:block animate-fade-in animate-delay-200">
                <div className="relative w-full max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-[2rem] rotate-3 opacity-20 blur-2xl scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400/30 to-emerald-400/30 rounded-[2rem] -rotate-2 scale-102" />
                  
                  <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-teal-500/30 border-4 border-white/20 backdrop-blur-sm">
                    <img 
                      src="/hero-image.jpg" 
                      alt="Hair Analysis Preview" 
                      className="w-full h-auto object-cover aspect-[4/5]"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    
                    <div 
                      className="absolute top-[20%] left-[25%] w-28 h-28 rounded-full animate-float"
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
                          <div className="text-[10px] font-bold text-white drop-shadow-lg">4C COILS</div>
                          <div className="text-[8px] text-white/80 drop-shadow">Detected</div>
                        </div>
                      </div>
                      <div className="absolute -inset-1 rounded-full border border-teal-400/50 animate-pulse" />
                    </div>
                    
                    <div 
                      className="absolute bottom-[30%] right-[15%] w-24 h-24 rounded-full"
                      style={{ animation: 'float 5s ease-in-out infinite 1s' }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/35 to-white/10 backdrop-blur-md border-2 border-white/40 shadow-xl" />
                      <div className="absolute inset-1 rounded-full border border-white/25" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20" />
                      <div className="absolute top-1.5 left-2.5 w-3 h-3 rounded-full bg-white/50 blur-sm" />
                      <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-white/70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-white drop-shadow-lg">HEALTHY</div>
                          <div className="text-[8px] text-white/80 drop-shadow">Scalp</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm">AI Analysis Complete</p>
                            <p className="text-xs text-slate-500">4C Natural Hair Detected</p>
                          </div>
                          <div className="ml-auto">
                            <span className="badge-premium text-xs">98% Match</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-xs text-slate-500">Porosity</div>
                            <div className="text-sm font-bold text-teal-600">Normal</div>
                          </div>
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-xs text-slate-500">Moisture</div>
                            <div className="text-sm font-bold text-emerald-600">85%</div>
                          </div>
                          <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="text-xs text-slate-500">Health</div>
                            <div className="text-sm font-bold text-amber-600">Great</div>
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

      <section className="section-padding bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="badge-premium mb-4">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Advanced Hair & Skin Analysis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Combining cutting-edge AI with dermatological expertise for comprehensive care
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Dual Analysis System"
              description="Analyze both hair and skin with specialized AI models. Get detailed assessments for 4A-4C hair types and all skin tones."
              gradient="from-teal-500 to-cyan-500"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Nigerian Hair Expertise"
              description="Specialized care for natural, relaxed, and transitioning hair with Nigerian-sourced organic treatment recommendations."
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Your Journey"
              description="Monitor your hair growth and skin healing with before/after comparisons and AI-measured progress tracking."
              gradient="from-violet-500 to-purple-500"
            />
            <FeatureCard
              icon={<Video className="w-6 h-6" />}
              title="Telehealth Consultations"
              description="Book video appointments with certified dermatologists and trichologists for personalized expert guidance."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<ShoppingBag className="w-6 h-6" />}
              title="Curated Products"
              description="Shop recommended hair and skincare products specifically selected for your unique profile and needs."
              gradient="from-pink-500 to-rose-500"
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Custom Formulations"
              description="Get personalized treatment formulas created based on your AI analysis results and specific concerns."
              gradient="from-emerald-500 to-green-500"
            />
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
                <span className="badge-premium">Why GlowSense?</span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold">
                  Trusted by Thousands for{" "}
                  <span className="text-gradient">Accurate Results</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Our AI is trained on diverse datasets specifically including African hair types and skin tones, ensuring accurate analysis for everyone.
                </p>
                <ul className="space-y-4">
                  {[
                    "Medical-grade AI trained by dermatologists",
                    "Specialized for 4A-4C hair textures",
                    "Nigerian hair care expertise built-in",
                    "Secure & private - your data stays yours"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  size="lg"
                  onClick={() => navigate('/scan')}
                  className="btn-premium mt-4"
                >
                  Try It Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Ready to Start Your Glow Journey?
            </h2>
            <p className="text-lg sm:text-xl text-white/80">
              Join thousands who have transformed their hair and skin with AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => navigate('/scan')}
                className="bg-white text-teal-600 hover:bg-white/90 shadow-xl shadow-black/10 text-lg px-8 py-6 h-auto rounded-xl font-semibold"
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
                <Video className="mr-2 h-5 w-5" />
                Book Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Medical Disclaimer:</strong> GlowSense AI is a clinical decision-support tool and wellness assistant. 
              It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed dermatologist for serious concerns.
            </p>
          </div>
        </div>
      </section>
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
