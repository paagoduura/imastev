import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast({ title: "Reset link unavailable", description: "Request a new password reset link.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmation) {
      toast({ title: "Passwords do not match", description: "Enter the same password in both fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPassword({ token, password });
      if (error) {
        toast({ title: "Unable to reset password", description: error.message, variant: "destructive" });
        return;
      }
      setUpdated(true);
    } catch (error) {
      toast({ title: "Something went wrong", description: error instanceof Error ? error.message : "Please request a new reset link.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7efe8] text-[#3b271b]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[34px] border border-[#3b271b]/10 bg-[#fffaf5] shadow-[0_28px_100px_rgba(59,39,27,0.16)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden bg-[#24160d] p-8 text-[#f8f3ec] lg:flex lg:flex-col lg:justify-between"><img src="/imstev-client-texture.jpeg" alt="Natural hair texture cared for by IMSTEV NATURALS" className="absolute inset-0 h-full w-full object-cover opacity-45" /><div className="absolute inset-0 bg-gradient-to-br from-[#24160d]/95 via-[#3b271b]/60 to-[#24160d]/80" /><div className="relative w-48 rounded-2xl bg-[#fffaf5] p-2 shadow-xl"><img src="/imstev-naturals-logo.jpeg" alt="IMSTEV NATURALS — Home of nature's beauty" className="h-auto w-full" /></div><div className="relative max-w-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d2a6]">A fresh beginning</p><h1 className="mt-4 font-display text-5xl leading-[0.95]">Come back to your ritual.</h1><p className="mt-5 text-sm leading-7 text-white/70">Create a new password and keep your care record, specialist conversations, and product edits close.</p></div><div className="relative flex items-center gap-2 text-xs text-white/60"><ShieldCheck className="h-4 w-4 text-[#f2d2a6]" /> Secure, private, and made for your care journey.</div></div>
          <div className="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-14"><button type="button" onClick={() => navigate("/auth")} className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#3b271b]/60 transition hover:text-[#3b271b]"><ArrowLeft className="h-4 w-4" /> Back to sign in</button><div className="mb-8"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#efe4f4] text-[#6b467a]"><KeyRound className="h-6 w-6" /></div><p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b5e3c]">New password</p><h2 className="mt-3 font-display text-5xl leading-none tracking-[-0.03em]">Reset your password.</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#3b271b]/60">Choose a new password with at least eight characters. This reset link can only be used once.</p></div>
            {updated ? <div className="rounded-[24px] border border-emerald-700/20 bg-emerald-50 p-5"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><h3 className="mt-4 font-display text-2xl">Password updated</h3><p className="mt-2 text-sm leading-6 text-emerald-950/70">Your password has been changed successfully. You can now sign in with your new password.</p><Button type="button" onClick={() => navigate("/auth")} className="mt-6 h-11 rounded-full bg-[#3b271b] px-5 text-[#f8f3ec] hover:bg-[#513622]">Continue to sign in <ArrowRight className="ml-2 h-4 w-4" /></Button></div> : !token ? <div className="rounded-[24px] border border-amber-700/20 bg-amber-50 p-5"><KeyRound className="h-6 w-6 text-amber-800" /><h3 className="mt-4 font-display text-2xl">This link is incomplete.</h3><p className="mt-2 text-sm leading-6 text-amber-950/70">Request another password reset link to continue.</p><Button type="button" onClick={() => navigate("/forgot-password")} className="mt-6 h-11 rounded-full bg-[#3b271b] px-5 text-[#f8f3ec] hover:bg-[#513622]">Request a new link</Button></div> : <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="reset-password">New password</Label><div className="relative"><Input id="reset-password" type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-12 rounded-2xl border-[#3b271b]/15 bg-white pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide new password" : "Show new password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b271b]/45 hover:text-[#3b271b]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><div className="space-y-2"><Label htmlFor="reset-confirmation">Confirm new password</Label><div className="relative"><Input id="reset-confirmation" type={showConfirmation ? "text" : "password"} required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your new password" className="h-12 rounded-2xl border-[#3b271b]/15 bg-white pr-12" /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b271b]/45 hover:text-[#3b271b]">{showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-[#3b271b] text-[#f8f3ec] hover:bg-[#513622]">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating password...</> : <>Update password <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="text-center text-xs leading-5 text-[#3b271b]/50">Use a password you do not reuse elsewhere.</p></form>}
            <p className="mt-10 text-sm text-[#3b271b]/60">Need a new link? <Link to="/forgot-password" className="font-semibold text-[#8b5e3c] hover:text-[#3b271b]">Request password reset</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
