import { ArrowUpRight, Instagram, Mail, MapPin, Phone, Scissors } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Our story", href: "/" },
  { label: "Start a scan", href: "/scan" },
  { label: "Book the studio", href: "/salon-booking" },
  { label: "Shop the edit", href: "/shop" },
  { label: "Community", href: "/community" },
];

export function Footer() {
  return (
    <footer className="bg-[#24160d] text-[#f8f2e8]">
      <div className="container-wide py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_.7fr_.8fr] lg:gap-20">
          <div className="max-w-md">
            <div className="flex items-center gap-4">
              <div className="w-[9.5rem] rounded-2xl bg-[#fffaf5] p-2 shadow-lg sm:w-[11rem]">
                <img src="/imstev-naturals-logo.jpeg" alt="IMSTEV NATURALS — Home of nature's beauty" className="h-auto w-full" />
              </div>
              <span className="sr-only">IMSTEV NATURALS, Home of nature&apos;s beauty</span>
            </div>
            <p className="mt-7 text-2xl leading-tight text-[#f8f2e8]/90 sm:text-3xl">A softer way to care for the beauty that is already yours.</p>
            <div className="mt-8 flex items-center gap-3"><a href="https://instagram.com" className="grid h-10 w-10 place-items-center rounded-full border border-[#f8f2e8]/15 transition hover:border-[#f2d2a6] hover:text-[#f2d2a6]" aria-label="Instagram"><Instagram size={16} /></a><a href="mailto:contact@imstevnaturals.com" className="grid h-10 w-10 place-items-center rounded-full border border-[#f8f2e8]/15 transition hover:border-[#f2d2a6] hover:text-[#f2d2a6]" aria-label="Email"><Mail size={16} /></a></div>
          </div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f2d2a6]">Explore</p><nav className="mt-5 space-y-3">{footerLinks.map((link) => <Link key={link.label} to={link.href} className="flex items-center gap-2 text-sm text-[#f8f2e8]/65 transition hover:text-[#f2d2a6]">{link.label}<ArrowUpRight size={13} /></Link>)}</nav></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f2d2a6]">Visit the studio</p><div className="mt-5 space-y-4 text-sm leading-6 text-[#f8f2e8]/65"><p className="flex gap-3"><MapPin size={17} className="mt-1 shrink-0 text-[#f2d2a6]" />40 Law School Road, Opp. FirstBank, Bwari, Abuja</p><a href="tel:+2349033505038" className="flex items-center gap-3 transition hover:text-[#f2d2a6]"><Phone size={16} className="text-[#f2d2a6]" />+234 903 350 5038</a><p className="flex items-start gap-3"><Scissors size={16} className="mt-1 text-[#f2d2a6]" /><span>Tue–Sat · 8am–6pm<br />Sun · 2pm–6pm<br />Mon · Closed</span></p></div><Link to="/salon-booking" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#f2d2a6]">Reserve a chair <ArrowUpRight size={15} /></Link></div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-[#f8f2e8]/10 pt-6 text-xs text-[#f8f2e8]/45 sm:flex-row"><p>© {new Date().getFullYear()} IMSTEV NATURALS. Made with care in Nigeria.</p><p>Our guidance supports your care; a qualified professional should advise on medical concerns.</p></div>
      </div>
    </footer>
  );
}
