import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Stethoscope, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

      // Load subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_ngn");

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Load current subscription
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
        // Create free subscription directly
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
          title: "Subscription activated",
          description: "You're now on the Free plan!",
        });
        loadData();
      } else {
        // For paid plans, create Stripe checkout
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
      case 'premium': return <Crown className="h-5 w-5" />;
      case 'family': return <Users className="h-5 w-5" />;
      case 'professional': return <Stethoscope className="h-5 w-5" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Unlock premium features and elevate your skincare journey
          </p>
        </div>

        {currentSubscription && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>
                {currentSubscription.subscription_plans.name} - Active until{" "}
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scans this period</p>
                  <p className="text-2xl font-bold">
                    {currentSubscription.scans_used_this_period}
                    {currentSubscription.subscription_plans.max_scans_per_month
                      ? ` / ${currentSubscription.subscription_plans.max_scans_per_month}`
                      : " / Unlimited"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const isFeatured = plan.tier === 'premium' || plan.tier === 'family';

            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${
                  isFeatured ? "border-primary shadow-md" : ""
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      {getTierIcon(plan.tier)}
                      {plan.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ₦{plan.price_ngn.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>
                    {plan.max_scans_per_month
                      ? `${plan.max_scans_per_month} scans per month`
                      : "Unlimited scans"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {Array.isArray(plan.features) && plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.includes_telehealth && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">Telehealth consultations</span>
                      </li>
                    )}
                    {plan.includes_custom_formulations && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">Custom formulations</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isFeatured ? "default" : "outline"}
                    disabled={isCurrentPlan || subscribing === plan.id}
                    onClick={() => handleSubscribe(plan.id, plan.tier)}
                  >
                    {subscribing === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
