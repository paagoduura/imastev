import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminLogin } from "@/lib/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      toast({ title: "Welcome back", description: "Your IMSTEV control room is ready." });
      navigate("/admin");
    } catch (error: any) {
      toast({ title: "Access denied", description: error?.message || "Check your administrator credentials.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#17110e] text-white selection:bg-[#d6a86c]/30">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_20%_15%,rgba(198,139,75,0.22),transparent_34%),linear-gradient(145deg,#251a14,#120e0c)] lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div className="absolute -right-24 top-28 h-72 w-72 rounded-full border border-[#d6a86c]/20" />
          <div className="absolute -right-10 top-42 h-44 w-44 rounded-full border border-[#d6a86c]/15" />
          <div className="relative">
            <img src="/imstev-naturals-logo.jpeg" alt="IMSTEV NATURALS" className="h-auto w-48 rounded-2xl bg-white p-3 object-contain shadow-2xl" />
            <p className="mt-12 max-w-lg text-sm font-medium uppercase tracking-[0.28em] text-[#d6a86c]">Operations, care, and craft</p>
            <h1 className="mt-5 max-w-xl font-display text-5xl leading-[1.04] tracking-[-0.04em] text-[#f6efe5] xl:text-6xl">The quiet engine behind exceptional care.</h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-[#c8bdb0]">Manage the store, service calendar, community, and customer care from one calm, considered workspace.</p>
          </div>
          <div className="relative grid max-w-xl grid-cols-3 gap-8 border-t border-white/10 pt-7 text-sm text-[#b7a99c]">
            <div><p className="text-2xl text-[#f6efe5]">01</p><p className="mt-2">Curate the shop</p></div>
            <div><p className="text-2xl text-[#f6efe5]">02</p><p className="mt-2">Guide every visit</p></div>
            <div><p className="text-2xl text-[#f6efe5]">03</p><p className="mt-2">Protect the standard</p></div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#fbf7f1] px-5 py-12 text-[#2d211b] sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><img src="/imstev-naturals-logo.jpeg" alt="IMSTEV NATURALS" className="h-20 w-32 rounded-xl bg-white p-2 object-contain shadow-sm" /></div>
            <div className="mb-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dfcfbd] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#806348]"><ShieldCheck className="h-4 w-4" /> Private workspace</div>
              <h2 className="font-display text-4xl tracking-[-0.04em]">Admin sign in</h2>
              <p className="mt-3 text-sm leading-6 text-[#7d6c5e]">Use your administrator account to enter the IMSTEV NATURALS control room.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-[#eadfd2] bg-white p-6 shadow-[0_24px_70px_rgba(67,40,22,0.10)] sm:p-8">
              <div className="space-y-2"><Label htmlFor="admin-email">Email address</Label><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a28d7c]" /><Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@imstevnaturals.com" autoComplete="username" className="h-12 border-[#e6d8ca] bg-[#fdfbf8] pl-10" required /></div></div>
              <div className="space-y-2"><Label htmlFor="admin-password">Password</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a28d7c]" /><Input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" className="h-12 border-[#e6d8ca] bg-[#fdfbf8] pl-10 pr-11" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8e7866] hover:text-[#38271d]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#6f432b] text-white hover:bg-[#58331f]">{loading ? "Verifying access…" : <>Enter control room <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
              <p className="text-center text-xs leading-5 text-[#948273]">Administrator access is monitored and restricted to authorized IMSTEV team members.</p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
