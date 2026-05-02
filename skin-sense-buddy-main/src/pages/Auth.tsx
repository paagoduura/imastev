import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Lock, Mail, ArrowRight, ThumbsUp, Users, Eye, EyeOff } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | boolean>
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [email, setEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const finishSignedInUser = async (userId: string, welcomeMessage = "Successfully signed in.") => {
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
      navigate("/onboarding", { replace: true });
      return;
    }

    toast({
      title: "Welcome back!",
      description: welcomeMessage,
    });
    navigate("/dashboard", { replace: true });
  };

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
          navigate("/onboarding", { replace: true });
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
  }, [navigate, searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          if (!credential) {
            toast({
              title: "Google sign-in failed",
              description: "Google did not return a usable sign-in credential.",
              variant: "destructive",
            });
            return;
          }

          setLoading(true);
          try {
            const { error, data } = await supabase.auth.signInWithGoogleIdToken({ credential });
            if (error) {
              toast({
                title: "Google sign-in failed",
                description: error.message,
                variant: "destructive",
              });
              return;
            }

            if (data?.user?.id) {
              setPendingVerificationEmail("");
              setSignInPassword("");
              setSignUpPassword("");
              await finishSignedInUser(data.user.id, "Signed in with Google.");
            }
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: activeTab === "signup" ? "signup_with" : "signin_with",
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return () => existingScript.removeEventListener("load", renderGoogleButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", renderGoogleButton, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener("load", renderGoogleButton);
  }, [activeTab, navigate, toast]);

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

      setPendingVerificationEmail(normalizedEmail);
      setActiveTab("signin");
      setSignInPassword("");
      setSignUpPassword("");
      toast({
        title: "Account created",
        description: data?.session
          ? "Your account is ready. You can sign in now."
          : "Check your email for the verification link before signing in.",
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
        if (message.includes("google sign-in")) {
          setSignInPassword("");
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
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 relative overflow-hidden bg-white">
        <div className="absolute inset-0 gradient-mesh opacity-80" />
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />

        <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                  <img
                    src="/imstev-logo.jpeg"
                    alt="IMSTEV NATURALS"
                    className="relative w-20 h-20 rounded-full object-cover ring-4 ring-primary/10 shadow-2xl"
                  />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
                Welcome to <span className="text-primary">IMSTEV NATURALS</span>
              </h1>
              <p className="text-muted-foreground text-lg">Home of Nature&apos;s Beauty</p>
            </div>

            <Card className="relative overflow-hidden border-primary/10 bg-white shadow-2xl shadow-primary/10">
              <CardContent className="relative p-6 sm:p-8">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-foreground">Secure Authentication</span>
                </div>

                {pendingVerificationEmail ? (
                  <div className="mb-6 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
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

                <div className="mb-6 space-y-3">
                  <div ref={googleButtonRef} className="flex min-h-11 items-center justify-center" />
                  {!GOOGLE_CLIENT_ID ? (
                    <p className="text-center text-xs text-muted-foreground">
                      Add `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` to enable Google sign-in.
                    </p>
                  ) : googleReady ? null : (
                    <p className="text-center text-xs text-muted-foreground">
                      Loading Google sign-in...
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    <div className="h-px flex-1 bg-primary/10" />
                    <span>or continue with email</span>
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-xl bg-primary/5 p-1 mb-6">
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
                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div className="space-y-2">
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
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="space-y-2">
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

                      <div className="space-y-2">
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
                            minLength={6}
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
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
                        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
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

            <div className="mt-8 grid grid-cols-3 gap-4">
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

            <p className="mt-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Auth;
