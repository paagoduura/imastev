import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Shield, Sparkles, Lock, Mail, ArrowRight, Star, Users, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created! You can now sign in.",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-600/10 to-amber-600/10 rounded-full blur-3xl" />

        <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-amber-500 rounded-full blur-xl opacity-60" />
                  <img 
                    src="/imstev-logo.png" 
                    alt="IMSTEV NATURALS" 
                    className="relative w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
                  />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
                Welcome to <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">IMSTEV NATURALS</span>
              </h1>
              <p className="text-white/70 text-lg">Home of Nature's Beauty</p>
            </div>

            <Card className="relative bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl shadow-black/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              
              <CardContent className="relative p-6 sm:p-8">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-semibold">Secure Authentication</span>
                </div>

                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10 p-1 rounded-xl mb-6">
                    <TabsTrigger 
                      value="signin" 
                      className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 transition-all duration-300"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 transition-all duration-300"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-0">
                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-white/90 font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <Input
                            id="signin-email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-white/90 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <Input
                            id="signin-password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-xl shadow-purple-500/25 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-[1.02]" 
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 animate-spin" />
                            Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Sign In
                            <ArrowRight className="w-5 h-5" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-white/90 font-medium">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <Input
                            id="signup-email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-white/90 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <Input
                            id="signup-password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 h-12 rounded-xl"
                          />
                        </div>
                        <p className="text-xs text-white/50">Minimum 6 characters</p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-xl shadow-purple-500/25 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-[1.02]" 
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 animate-spin" />
                            Creating account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Create Account
                            <ArrowRight className="w-5 h-5" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { icon: Shield, label: "Secure", sublabel: "Data Protected" },
                { icon: Users, label: "100K+", sublabel: "Happy Users" },
                { icon: Star, label: "4.9/5", sublabel: "Rating" },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-white/50 text-xs">{item.sublabel}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-white/50 mt-8">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Auth;
