import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Lock, Mail, ArrowRight, ThumbsUp, Users, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [email, setEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const finishSignedInUser = useCallback(async (userId: string, welcomeMessage = "Successfully signed in.") => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, age, skin_type, fitzpatrick_scale')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed after sign in:", profileError);
      toast({
        title: "Welcome back!",
        description: welcomeMessage,
      });
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!profileData || !profileData.full_name || !profileData.age || !profileData.skin_type || !profileData.fitzpatrick_scale) {
      toast({
        title: "Welcome!",
        description: "Let's complete your profile setup.",
      });
      navigate("/dashboard", { replace: true });
      return;
    }

    toast({
      title: "Welcome back!",
      description: welcomeMessage,
    });
    navigate("/dashboard", { replace: true });
  }, [navigate, toast]);

  useEffect(() => {
    const token = searchParams.get("token")?.trim() || searchParams.get("verify_token")?.trim();
    if (!token) return;

    let cancelled = false;

    const verifyEmail = async () => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.verifyEmail({ token });
        if (cancelled) return;

        if (error) {
          toast({
            title: "Verification failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setPendingVerificationEmail("");
          toast({
            title: "Email verified",
            description: "Your account is ready. Let's finish setting up your profile.",
          });
          navigate("/dashboard", { replace: true });
        }
      } finally {
        if (!cancelled) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete("token");
          nextParams.delete("verify_token");
          setSearchParams(nextParams, { replace: true });
          setLoading(false);
        }
      }
    };

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [finishSignedInUser, navigate, searchParams, setSearchParams, toast]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const password = signUpPassword;

    if (!normalizedEmail || !password) {
      toast({
        title: "Error",
        description: "Email and password are required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Bug 28 fix: enforce minimum password length
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error, data } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already exists")) {
          setActiveTab("signin");
          setPendingVerificationEmail(normalizedEmail);
          setSignInPassword(password);
          toast({
            title: "Account already exists",
            description: "This email is already registered. Sign in instead, or resend the verification email below.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!data?.user) {
        toast({
          title: "Error",
          description: "Account was not created. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSignInPassword("");
      setSignUpPassword("");

      if (data.session?.user?.id) {
        setPendingVerificationEmail("");
        await finishSignedInUser(data.session.user.id, "Your account is ready.");
        return;
      }

      setPendingVerificationEmail(normalizedEmail);
      setActiveTab("signin");
      toast({
        title: "Account created",
        description: "Check your email for the verification link before signing in.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Unable to create your account right now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const password = signInPassword;

    if (!normalizedEmail || !password) {
      toast({
        title: "Error",
        description: "Email and password are required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("verify")) {
          setPendingVerificationEmail(normalizedEmail);
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data?.user) {
        await finishSignedInUser(data.user.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = pendingVerificationEmail.trim().toLowerCase();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the same email you used to create your account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resendVerificationEmail({ email });
      if (error) {
        toast({
          title: "Unable to resend email",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Verification email sent",
        description: `A new verification link was sent to ${email}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-none overflow-x-hidden bg-[#f7efe8] text-foreground">
      <section className="relative min-h-screen bg-gradient-to-br from-[#efe2d6] via-[#fffaf6] to-[#d7c0ab]">
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(98,63,41,0.18),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(255,255,255,0.7),transparent_26%),radial-gradient(circle_at_60%_80%,rgba(140,98,66,0.18),transparent_28%)]" />
          <div className="relative flex min-h-screen w-full items-stretch justify-stretch px-0 py-0">
            <div className="relative w-full overflow-hidden bg-transparent">
              <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative h-full min-h-0 overflow-hidden bg-[#1b120d]">
                  <video
                    src="/auth-drop.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-stone-950/95 via-stone-900/55 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(17,12,9,0.5)_72%,rgba(17,12,9,0.82)_100%)]" />

                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute left-4 top-8 z-20 w-24 sm:left-8 sm:top-12 sm:w-28 subtle-float" style={{ animationDelay: "0ms" }}>
                      <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 shadow-2xl backdrop-blur-lg">
                        <img src="/4c_twist_updo_hairstyle.png" alt="" aria-hidden="true" className="h-20 w-full rounded-xl object-cover" />
                      </div>
                    </div>
                    <div className="absolute right-6 top-16 z-30 w-28 sm:right-10 sm:top-20 sm:w-32 subtle-float" style={{ animationDelay: "1.2s" }}>
                      <div className="overflow-hidden rounded-[1.5rem] border border-amber-100/25 bg-white/10 p-2 shadow-2xl backdrop-blur-lg">
                        <img src="/kids_beaded_twist_hairstyle.png" alt="" aria-hidden="true" className="h-24 w-full rounded-xl object-cover" />
                      </div>
                    </div>
                    <div className="absolute bottom-8 left-10 z-20 w-24 sm:left-16 sm:w-28 subtle-float" style={{ animationDelay: "0.7s" }}>
                      <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 shadow-2xl backdrop-blur-lg">
                        <img src="/gallery-3.jpg" alt="" aria-hidden="true" className="h-20 w-full rounded-xl object-cover" />
                      </div>
                    </div>
                    <div className="absolute bottom-10 right-8 z-20 w-24 sm:right-14 sm:w-28 subtle-float" style={{ animationDelay: "1.6s" }}>
                      <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 shadow-2xl backdrop-blur-lg">
                        <img src="/gallery-4.jpg" alt="" aria-hidden="true" className="h-20 w-full rounded-xl object-cover" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                    <div className="relative h-[15rem] w-[15rem] max-w-full sm:h-[20rem] sm:w-[20rem] lg:h-[24rem] lg:w-[24rem]">
                      <div className="absolute inset-0 translate-x-8 translate-y-8 rounded-[2.5rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm" />
                      <div className="absolute inset-4 -translate-x-4 translate-y-4 rounded-[2.2rem] border border-amber-100/25 bg-white/10 shadow-xl backdrop-blur-md" />
                      <div className="absolute inset-8 rounded-[2rem] border border-white/20 bg-white/10 shadow-[0_22px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl" />
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="max-w-[12rem] rounded-[1.75rem] border border-white/20 bg-black/20 px-5 py-5 text-center shadow-2xl backdrop-blur-xl sm:max-w-[14rem] sm:px-6 sm:py-7">
                          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 sm:mb-3 sm:h-12 sm:w-12">
                            <Shield className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.38em] text-amber-100/80">Hair care cube</p>
                          <h2 className="mt-2 text-xl font-display font-bold leading-tight text-white sm:mt-3 sm:text-2xl">
                            Beauty in motion
                          </h2>
                          <p className="mt-1 text-xs text-white/75 sm:mt-2 sm:text-sm">
                            Sign in and step into your IMSTEV NATURALS space.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-4 top-4 z-40 rounded-full border border-white/20 bg-black/25 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/80 backdrop-blur-md sm:left-8 sm:top-8">
                    IMSTEV NATURALS
                  </div>
                </div>

                <div className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#fffaf5] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                  <div className="w-full max-w-none">
                      <div className="mb-4 text-center lg:text-left sm:mb-6">
                      <div className="mb-4 flex justify-center lg:justify-start sm:mb-5">
                        <div className="w-44 rounded-2xl border border-[#3b271b]/10 bg-white p-2 shadow-[0_12px_36px_rgba(59,39,27,0.12)] sm:w-52">
                          <img
                            src="/imstev-naturals-logo.jpeg"
                            alt="IMSTEV NATURALS — Home of nature's beauty"
                            className="h-auto w-full"
                          />
                        </div>
                      </div>
                      <h1 className="text-2xl font-display font-bold text-foreground sm:text-3xl lg:text-4xl">
                        Welcome to <span className="text-primary">IMSTEV NATURALS</span>
                      </h1>
                      <p className="text-sm text-muted-foreground sm:text-base">Home of Nature&apos;s Beauty</p>
                    </div>

                    <Card className="relative w-full overflow-hidden border-primary/10 bg-white shadow-2xl shadow-primary/10">
                      <CardContent className="relative p-4 sm:p-6 lg:p-8">
                        <div className="mb-4 flex items-center justify-center gap-2 sm:mb-5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 sm:h-10 sm:w-10">
                            <Shield className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                          </div>
                          <span className="text-sm font-semibold text-foreground sm:text-base">Secure Authentication</span>
                        </div>

                        {pendingVerificationEmail ? (
                          <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-foreground sm:mb-5 sm:p-4">
                            <p className="font-medium">Finish setting up your account</p>
                            <p className="mt-1 text-muted-foreground">
                              Verify <span className="font-medium text-foreground">{pendingVerificationEmail}</span> before signing in.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-3 h-10 rounded-lg border-primary/20 bg-white"
                              onClick={handleResendVerification}
                              disabled={loading}
                            >
                              {loading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Sending...
                                </span>
                              ) : (
                                "Resend verification email"
                              )}
                            </Button>
                          </div>
                        ) : null}

                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")} className="w-full">
                          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-xl bg-primary/5 p-1 sm:mb-5">
                            <TabsTrigger
                              value="signin"
                              className="rounded-lg text-muted-foreground transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                            >
                              Sign In
                            </TabsTrigger>
                            <TabsTrigger
                              value="signup"
                              className="rounded-lg text-muted-foreground transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                            >
                              Sign Up
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="signin" className="mt-0">
                            <form onSubmit={handleSignIn} className="space-y-4" autoComplete="on">
                              <div className="space-y-1.5">
                                <Label htmlFor="signin-email" className="font-medium text-foreground">
                                  Email Address
                                </Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="signin-email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-xl border-primary/15 bg-white pl-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="signin-password" className="font-medium text-foreground">
                                  Password
                                </Label>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="signin-password"
                                    name="password"
                                    type={showSignInPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    required
                                    value={signInPassword}
                                    onChange={(e) => setSignInPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="h-12 rounded-xl border-primary/15 bg-white pl-11 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowSignInPassword((value) => !value)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                                  >
                                    {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                              </div>

                              <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
                                disabled={loading}
                              >
                                {loading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Signing in...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    Sign In
                                    <ArrowRight className="h-5 w-5" />
                                  </span>
                                )}
                              </Button>
                              <div className="flex items-center justify-between gap-3 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
                                <span>Need help getting back in?</span>
                                <Link to="/forgot-password" className="font-semibold text-primary transition-colors hover:text-primary/80">
                                  Forgot password?
                                </Link>
                              </div>
                            </form>
                          </TabsContent>

                          <TabsContent value="signup" className="mt-0">
                            <form onSubmit={handleSignUp} className="space-y-4" autoComplete="on">
                              <div className="space-y-1.5">
                                <Label htmlFor="signup-email" className="font-medium text-foreground">
                                  Email Address
                                </Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-xl border-primary/15 bg-white pl-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="signup-password" className="font-medium text-foreground">
                                  Password
                                </Label>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    id="signup-password"
                                    name="password"
                                    type={showSignUpPassword ? "text" : "password"}
                                    placeholder="Create your password"
                                    required
                                    minLength={8}
                                    value={signUpPassword}
                                    onChange={(e) => setSignUpPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="h-12 rounded-xl border-primary/15 bg-white pl-11 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowSignUpPassword((value) => !value)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                                  >
                                    {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                              </div>

                              <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
                                disabled={loading}
                              >
                                {loading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Creating account...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    Create Account
                                    <ArrowRight className="h-5 w-5" />
                                  </span>
                                )}
                              </Button>
                            </form>
                          </TabsContent>
                        </Tabs>

                      </CardContent>
                    </Card>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-3">
                      {[
                        { icon: Shield, label: "Secure", sublabel: "Data Protected" },
                        { icon: Users, label: "100K+", sublabel: "Happy Users" },
                        { icon: ThumbsUp, label: "4.9/5", sublabel: "Rating" },
                      ].map((item, i) => (
                        <div key={i} className="text-center">
                          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-center text-[11px] text-muted-foreground sm:mt-5 sm:text-xs">
                      By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>
    </div>
  );
};

export default Auth;
