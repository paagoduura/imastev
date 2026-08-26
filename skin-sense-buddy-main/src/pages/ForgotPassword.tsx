import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [previewResetUrl, setPreviewResetUrl] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.requestPasswordReset({ email: normalizedEmail });
      if (error) {
        toast({ title: "Unable to start reset", description: error.message, variant: "destructive" });
        return;
      }
      setPreviewResetUrl(typeof data?.previewResetUrl === "string" ? data.previewResetUrl : "");
      setSent(true);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7efe8] text-[#3b271b]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[34px] border border-[#3b271b]/10 bg-[#fffaf5] shadow-[0_28px_100px_rgba(59,39,27,0.16)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden bg-[#24160d] p-8 text-[#f8f3ec] lg:flex lg:flex-col lg:justify-between">
            <img src="/imstev-client-profile.jpeg" alt="IMSTEV NATURALS client care" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#24160d]/95 via-[#3b271b]/60 to-[#24160d]/80" />
            <div className="relative w-48 rounded-2xl bg-[#fffaf5] p-2 shadow-xl"><img src="/imstev-naturals-logo.jpeg" alt="IMSTEV NATURALS — Home of nature's beauty" className="h-auto w-full" /></div>
            <div className="relative max-w-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d2a6]">A softer way back in</p><h1 className="mt-4 font-display text-5xl leading-[0.95]">Your care space is still here.</h1><p className="mt-5 text-sm leading-7 text-white/70">Reset your password and return to the scans, specialists, care routines, and community that make IMSTEV personal.</p></div>
            <div className="relative flex items-center gap-2 text-xs text-white/60"><ShieldCheck className="h-4 w-4 text-[#f2d2a6]" /> Your account details stay private.</div>
          </div>

          <div className="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-14">
            <button type="button" onClick={() => navigate("/auth")} className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3b271b]/60 transition hover:text-[#3b271b]"><ArrowLeft className="h-4 w-4" /> Back to sign in</button>
            <div className="mb-8"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#efe4f4] text-[#6b467a]"><KeyRound className="h-6 w-6" /></div><p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b5e3c]">Account recovery</p><h2 className="mt-3 font-display text-5xl leading-none tracking-[-0.03em]">Forgot your password?</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#3b271b]/60">Enter the email attached to your IMSTEV account. We&apos;ll send a secure link to create a new password.</p></div>

            {sent ? (
              <div className="rounded-[24px] border border-emerald-700/20 bg-emerald-50 p-5"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><h3 className="mt-4 font-display text-2xl">Check your inbox</h3><p className="mt-2 text-sm leading-6 text-emerald-950/70">If an account exists for <strong>{email.trim().toLowerCase()}</strong>, a reset link has been sent. The link expires in one hour and works once.</p>{previewResetUrl && <div className="mt-5 rounded-2xl border border-amber-700/20 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">Preview reset link</p><p className="mt-2 text-xs leading-5 text-amber-950/70">Email delivery is not configured in this preview. Use this development-only link to test the reset journey.</p><a href={previewResetUrl} className="mt-3 inline-flex items-center gap-2 break-all text-sm font-semibold text-amber-900 underline underline-offset-4">Open reset link <ArrowRight className="h-4 w-4 shrink-0" /></a></div>}<Button type="button" onClick={() => navigate("/auth")} className="mt-6 h-11 rounded-full bg-[#3b271b] px-5 text-[#f8f3ec] hover:bg-[#513622]">Return to sign in</Button></div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="forgot-email">Email address</Label><div className="relative"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3b271b]/45" /><Input id="forgot-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 rounded-2xl border-[#3b271b]/15 bg-white pl-11" /></div></div><Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-[#3b271b] text-[#f8f3ec] hover:bg-[#513622]">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending secure link...</> : <>Send reset link <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="text-center text-xs leading-5 text-[#3b271b]/50">For your security, we use the same message whether or not an account exists.</p></form>
            )}
            <p className="mt-10 text-sm text-[#3b271b]/60">Remembered your password? <Link to="/auth" className="font-semibold text-[#8b5e3c] hover:text-[#3b271b]">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
