import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, Camera, LogOut, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, type StoredUser } from "@/integrations/supabase/client";

const links = [
  { label: "My Care", href: "/dashboard" },
  { label: "Scan", href: "/scan" },
  { label: "Book", href: "/salon-booking" },
  { label: "Shop", href: "/shop" },
  { label: "Community", href: "/community" },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const go = (href: string) => navigate(href);
  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-[#24160d]/10 bg-[#f5f0e7]/90 shadow-[0_8px_30px_rgba(72,43,22,.06)] backdrop-blur-xl" : "bg-[#f5f0e7]"}`}>
        <div className="container-wide flex h-[4.75rem] items-center justify-between gap-4">
          <button type="button" onClick={() => go("/")} className="group flex items-center gap-3 text-left" aria-label="IMSTEV NATURALS home">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fffaf5] ring-1 ring-[#24160d]/15 shadow-lg transition duration-300 group-hover:rotate-3">
              <img src="/imstev-naturals-mark.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="hidden sm:block"><span className="block text-[13px] font-bold tracking-[.15em] text-[#24160d]">IMSTEV NATURALS</span><span className="mt-0.5 block text-[10px] uppercase tracking-[.16em] text-[#8b7766]">Home of nature&apos;s beauty</span></span>
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-[#24160d]/10 bg-[#f8f2e8]/60 p-1 lg:flex" aria-label="Primary navigation">
            {links.map((link) => { const active = location.pathname === link.href || (link.href === "/dashboard" && location.pathname === "/profile"); return <button key={link.href} type="button" onClick={() => go(link.href)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${active ? "bg-[#24160d] text-[#f8f2e8]" : "text-[#756253] hover:bg-[#e7d6bd] hover:text-[#24160d]"}`}>{link.label}</button>; })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button type="button" onClick={() => go(user ? "/dashboard" : "/auth")} className="inline-flex items-center gap-2 text-xs font-bold text-[#756253] transition hover:text-[#a45a2a]"><UserRound size={16} /> {user ? "Account" : "Sign in"}</button>
            <button type="button" onClick={() => go("/scan")} className="ink-button !px-4 !py-2.5"><Camera size={15} /> Start scan</button>
          </div>

          <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-[#24160d]/10 text-[#24160d] lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-[#24160d]/20 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-[min(88vw,360px)] flex-col bg-[#f8f2e8] p-6 shadow-2xl transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`} aria-label="Mobile navigation">
        <div className="flex items-center justify-between"><span className="text-[12px] font-bold tracking-[.15em]">IMSTEV NATURALS</span><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#24160d]/10" aria-label="Close menu"><X size={18} /></button></div>
        <div className="mt-12 space-y-2">{links.map((link) => <button key={link.href} type="button" onClick={() => go(link.href)} className="flex w-full items-center justify-between border-b border-[#24160d]/10 py-4 text-left font-serif text-2xl text-[#24160d]">{link.label}<ArrowUpRight size={18} className="text-[#a45a2a]" /></button>)}</div>
        <div className="mt-auto space-y-3 border-t border-[#24160d]/10 pt-6"><button type="button" onClick={() => go(user ? "/dashboard" : "/auth")} className="outline-button w-full"><UserRound size={16} /> {user ? "My account" : "Sign in"}</button><button type="button" onClick={() => go("/scan")} className="ink-button w-full"><Camera size={16} /> Start a scan</button>{user && <button type="button" onClick={signOut} className="inline-flex w-full items-center justify-center gap-2 py-3 text-sm text-[#8b7766]"><LogOut size={15} /> Sign out</button>}</div>
      </aside>
      <nav className="mobile-actionbar" aria-label="Quick actions">
        {[
          { label: "Scan", href: "/scan", icon: Camera },
          { label: "Book", href: "/salon-booking", icon: CalendarDays },
          { label: "Shop", href: "/shop", icon: ShoppingBag },
        ].map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;
          return <button key={item.href} type="button" onClick={() => go(item.href)} className={active ? "is-active" : ""}><Icon size={17} /><span>{item.label}</span></button>;
        })}
      </nav>
    </>
  );
}
