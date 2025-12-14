import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Sparkles, ArrowLeft, Loader2, Star, Zap, Shield, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_ngn: number;
  features: any;
  max_scans_per_month: number | null;
  max_family_members: number;
  includes_telehealth: boolean;
  includes_custom_formulations: boolean;
  description: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  scans_used_this_period: number;
  subscription_plans: Plan;
}

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

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

      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_ngn");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setCurrentSubscription(subData);
    } catch (error: any) {
      toast({
        title: "Error loading subscription data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, planTier: string) => {
    setSubscribing(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (planTier === 'free') {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Welcome to IMSTEV NATURALS!",
          description: "Your Starter plan is now active.",
        });
        loadData();
      } else {
        const plan = plans.find(p => p.id === planId);
        if (!plan) throw new Error("Plan not found");

        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { planId, planName: plan.name, price: plan.price_ngn },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Crown className="h-6 w-6" />;
      case 'family': return <Users className="h-6 w-6" />;
      default: return <Sparkles className="h-6 w-6" />;
    }
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'premium': return 'from-purple-600 via-purple-500 to-amber-500';
      case 'family': return 'from-amber-500 via-orange-500 to-rose-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getTierBorderGradient = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-gradient-to-r from-purple-500 to-amber-500';
      case 'family': return 'bg-gradient-to-r from-amber-500 to-rose-500';
      default: return 'bg-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="gradient-mesh min-h-[calc(100vh-80px)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              IMSTEV NATURALS Membership
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-amber-600 bg-clip-text text-transparent mb-4">
              Choose Your Beauty Journey
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock the power of AI-driven hair and skin analysis. Join thousands of women achieving their beauty goals with IMSTEV NATURALS.
            </p>
          </div>

          {currentSubscription && (
            <Card className="mb-10 border-0 shadow-xl bg-gradient-to-r from-purple-50 to-amber-50 dark:from-purple-900/20 dark:to-amber-900/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Your Active Membership</CardTitle>
                    <CardDescription>
                      {currentSubscription.subscription_plans.name} Plan
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Scans Used</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                      {currentSubscription.scans_used_this_period}
                      {currentSubscription.subscription_plans.max_scans_per_month
                        ? ` / ${currentSubscription.subscription_plans.max_scans_per_month}`
                        : " / Unlimited"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Renews</p>
                    <p className="text-lg font-semibold">
                      {new Date(currentSubscription.current_period_end).toLocaleDateString('en-NG', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-2 text-sm">
                    <Zap className="h-4 w-4 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const isCurrentPlan = currentSubscription?.plan_id === plan.id;
              const isPremium = plan.tier === 'premium';
              const isFamily = plan.tier === 'family';
              const isFeatured = isPremium;

              return (
                <div key={plan.id} className="relative">
                  {isFeatured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-purple-600 to-amber-500 text-white border-0 px-4 py-1.5 text-sm shadow-lg">
                        <Crown className="h-3.5 w-3.5 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <Card className={`relative h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    isFeatured 
                      ? 'border-2 border-purple-400 dark:border-purple-500 shadow-xl shadow-purple-500/10' 
                      : isFamily 
                        ? 'border-2 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-500/10'
                        : 'border border-slate-200 dark:border-slate-700'
                  } ${isCurrentPlan ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                    
                    <div className={`absolute inset-x-0 top-0 h-1 rounded-t-lg ${getTierBorderGradient(plan.tier)}`} />
                    
                    <CardHeader className="pt-8 pb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${getTierGradient(plan.tier)} shadow-lg`}>
                        <div className="text-white">
                          {getTierIcon(plan.tier)}
                        </div>
                      </div>
                      
                      <CardTitle className="text-2xl font-display">{plan.name}</CardTitle>
                      <CardDescription className="text-sm min-h-[40px]">
                        {plan.description}
                      </CardDescription>
                      
                      <div className="pt-4">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold ${isFeatured || isFamily ? 'bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent' : ''}`}>
                            {plan.price_ngn === 0 ? 'Free' : `₦${plan.price_ngn.toLocaleString()}`}
                          </span>
                          {plan.price_ngn > 0 && (
                            <span className="text-muted-foreground text-sm">/month</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.max_scans_per_month 
                            ? `${plan.max_scans_per_month} scans included`
                            : 'Unlimited scans'}
                        </p>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-4">
                      <ul className="space-y-3">
                        {Array.isArray(plan.features) && plan.features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-full ${
                              isFeatured 
                                ? 'bg-purple-100 dark:bg-purple-900/30' 
                                : isFamily 
                                  ? 'bg-amber-100 dark:bg-amber-900/30'
                                  : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              <Check className={`h-3 w-3 ${
                                isFeatured 
                                  ? 'text-purple-600 dark:text-purple-400' 
                                  : isFamily 
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-400'
                              }`} />
                            </div>
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                        {plan.includes_telehealth && (
                          <li className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-full ${isFeatured ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                              <Check className={`h-3 w-3 ${isFeatured ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`} />
                            </div>
                            <span className="text-sm text-muted-foreground">Expert consultations</span>
                          </li>
                        )}
                        {plan.includes_custom_formulations && (
                          <li className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-full ${isFeatured ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                              <Check className={`h-3 w-3 ${isFeatured ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`} />
                            </div>
                            <span className="text-sm text-muted-foreground">Custom formulations</span>
                          </li>
                        )}
                        {plan.max_family_members > 1 && (
                          <li className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
                              <Gift className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-sm text-muted-foreground">Up to {plan.max_family_members} family members</span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    
                    <CardFooter className="pt-4 pb-6">
                      <Button
                        className={`w-full h-12 text-base font-medium transition-all ${
                          isFeatured 
                            ? 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40' 
                            : isFamily
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                              : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                        }`}
                        disabled={isCurrentPlan || subscribing === plan.id}
                        onClick={() => handleSubscribe(plan.id, plan.tier)}
                      >
                        {subscribing === plan.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Current Plan
                          </>
                        ) : plan.tier === 'free' ? (
                          'Get Started Free'
                        ) : (
                          `Subscribe to ${plan.name}`
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Instant Activation
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-purple-500" />
                Cancel Anytime
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground max-w-lg mx-auto">
              All prices are in Nigerian Naira (NGN). Subscriptions auto-renew monthly. 
              You can cancel anytime from your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
