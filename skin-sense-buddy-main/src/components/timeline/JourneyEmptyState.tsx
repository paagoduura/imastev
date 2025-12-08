import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JourneyEmptyStateProps {
  type: "skin" | "hair";
}

export function JourneyEmptyState({ type }: JourneyEmptyStateProps) {
  const navigate = useNavigate();
  
  const content = {
    skin: {
      title: "Begin Your Skin Journey",
      description: "Track your skin health progress with AI-powered insights and personalized recommendations",
      features: [
        { icon: Sparkles, title: "AI Skin Analysis", desc: "Get instant dermatological insights" },
        { icon: TrendingDown, title: "Track Improvement", desc: "Monitor skin healing over time" },
      ],
      buttonText: "Take Skin Scan",
      gradient: "from-primary to-primary-glow",
    },
    hair: {
      title: "Begin Your Hair Journey",
      description: "Track your hair health progress with specialized 4A-4C hair analysis and Nigerian hair expertise",
      features: [
        { icon: Sparkles, title: "AI Hair Analysis", desc: "Specialized for natural African hair" },
        { icon: TrendingDown, title: "Growth Tracking", desc: "Monitor moisture, protein & scalp health" },
      ],
      buttonText: "Take Hair Scan",
      gradient: "from-amber-500 to-orange-500",
    },
  };

  const c = content[type];

  return (
    <Card className="max-w-md mx-auto text-center shadow-strong border-primary/20 animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="space-y-6 pb-4">
        <div className="relative mx-auto">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
            <Camera className="w-10 h-10 text-white" />
          </div>
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${c.gradient} opacity-30 blur-xl animate-pulse`} />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{c.title}</CardTitle>
          <CardDescription className="text-base">{c.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-8">
        <div className="grid gap-3 text-sm text-left">
          {c.features.map((feature, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-left"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{feature.title}</p>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Button 
          size="lg" 
          className="w-full shadow-medium" 
          onClick={() => navigate("/scan")}
        >
          <Camera className="w-4 h-4 mr-2" />
          {c.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}