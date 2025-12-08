import { Button } from "@/components/ui/button";
import { Camera, Sparkles, TrendingUp, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary-light/10 to-background">
      <Navbar />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-light/50 border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Clinical-Grade AI Analysis</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Your Hair & Skin's
              <span className="block bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                Personal AI Expert
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Get instant, accurate hair and skin analysis powered by medical-grade AI. Specialized expertise for 4A-4C hair types with personalized treatment plans.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary-glow text-primary-foreground text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => navigate('/scan')}
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Free Scan
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary-light text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>100K+ Users Trust Us</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>95% Accuracy Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Advanced Hair & Skin Analysis
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Combining cutting-edge AI with dermatological and trichological expertise for comprehensive care
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Camera className="w-8 h-8" />}
            title="Dual Analysis System"
            description="Analyze both hair and skin with specialized AI models. Get detailed assessments for 4A-4C hair types and all skin tones"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Nigerian Hair Expertise"
            description="Specialized care for natural, relaxed, and transitioning hair with Nigerian-sourced organic treatments"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Track Your Journey"
            description="Monitor your hair growth and skin healing with before/after comparisons and AI-measured progress"
          />
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-muted/50 border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground text-center">
            <strong className="text-foreground">Medical Disclaimer:</strong> GlowSense AI is a clinical decision-support tool and wellness assistant. 
            It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed dermatologist for serious concerns.
          </p>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative space-y-4">
      <div className="w-16 h-16 rounded-xl bg-primary-light flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

export default Index;
