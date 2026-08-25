import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Droplets,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  ScanLine,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { HeroShowcaseCarousel } from "@/components/layout/HeroShowcaseCarousel";
import { SpecialistVideoCarousel } from "@/components/layout/SpecialistVideoCarousel";

const careJourneys = [
  {
    number: "01",
    eyebrow: "Understand",
    title: "Scan with confidence",
    body: "A guided view of your hair, scalp, and skin—built around the textures and tones too often left out.",
    href: "/scan",
    icon: ScanLine,
    className: "bg-[#d8c4a8]",
  },
  {
    number: "02",
    eyebrow: "Be cared for",
    title: "Meet your specialist",
    body: "Move from insight to action with salon rituals and consultations shaped around your real routine.",
    href: "/salon-booking",
    icon: Scissors,
    className: "bg-[#c8d2bd]",
  },
  {
    number: "03",
    eyebrow: "Keep growing",
    title: "Build your ritual",
    body: "Shop a considered edit of products, save your routine, and keep your progress close.",
    href: "/shop",
    icon: ShoppingBag,
    className: "bg-[#e4c9b6]",
  },
];

const serviceCards = [
  { title: "Hair & scalp scan", body: "Texture-aware guidance for coils, locs, braids, and every stage between.", icon: ScanLine, href: "/scan" },
  { title: "Skin care scan", body: "A calm starting point for understanding what your skin may need next.", icon: Droplets, href: "/scan" },
  { title: "Salon rituals", body: "Expert styling and treatments in a warm, specialist-led studio.", icon: Scissors, href: "/salon-booking" },
  { title: "Video consultation", body: "Speak with a care professional when you want a human point of view.", icon: MessageCircle, href: "/telehealth" },
];

const communityStories = [
  { tag: "Protective styles", title: "How to keep your scalp cared for between appointments", read: "6 min read" },
  { tag: "Texture notes", title: "Porosity is not a problem to fix—it is a language to learn", read: "4 min read" },
  { tag: "From the studio", title: "A wash-day ritual for softer, stronger natural hair", read: "5 min read" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <Navbar />
      <main>
        <section className="container-wide pt-5 sm:pt-8">
          <HeroShowcaseCarousel />
        </section>

        <section className="container-wide py-7 sm:py-10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-[#24160d]/10 py-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#756253] sm:justify-between">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[#a45a2a]" /> Built for African beauty</span>
            <span className="inline-flex items-center gap-2"><Leaf size={15} className="text-[#71856b]" /> Nature-led care</span>
            <span className="inline-flex items-center gap-2"><Users size={15} className="text-[#a45a2a]" /> Specialist-backed</span>
            <span className="inline-flex items-center gap-2"><Heart size={15} className="text-[#a45a2a]" /> Made in Nigeria</span>
          </div>
        </section>

        <section id="how-it-works" className="container-wide py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div className="max-w-md">
              <p className="eyebrow">A better beauty beginning</p>
              <h1 className="mt-4 text-4xl leading-[.98] tracking-[-.055em] sm:text-6xl">Your care should feel as considered as you are.</h1>
              <p className="mt-6 text-base leading-8 text-[#6e5b4c]">IMSTEV brings together guided scans, expert hands, considered products, and a community that understands the beauty of African hair and skin.</p>
              <button type="button" className="ink-button mt-8" onClick={() => navigate("/scan")}>Discover your care path <ArrowRight size={17} /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {careJourneys.map((journey) => {
                const Icon = journey.icon;
                return (
                  <button key={journey.number} type="button" onClick={() => navigate(journey.href)} className={`group relative min-h-[280px] overflow-hidden rounded-[1.6rem] p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(72,43,22,.14)] ${journey.className}`}>
                    <span className="absolute -right-2 -top-5 font-serif text-[8rem] leading-none text-[#24160d]/[.08]">{journey.number}</span>
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#24160d] text-[#f8f2e8]"><Icon size={18} strokeWidth={1.7} /></span>
                    <span className="relative mt-20 block text-[10px] font-bold uppercase tracking-[.2em] text-[#6e4d34]">{journey.eyebrow}</span>
                    <span className="relative mt-2 block font-serif text-2xl leading-none tracking-[-.03em] text-[#24160d]">{journey.title}</span>
                    <span className="relative mt-3 block text-sm leading-6 text-[#574637]">{journey.body}</span>
                    <span className="relative mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#24160d]">Explore <ArrowUpRight size={14} /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="warm-section grain py-16 sm:py-24">
          <div className="container-wide">
            <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
              <div className="relative mx-auto w-full max-w-[27rem]">
                <div className="absolute -left-5 top-10 z-10 flex items-center gap-2 rounded-full border border-[#f8f2e8]/60 bg-[#f8f2e8]/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#72523a] shadow-lg"><CircleCheck size={14} className="text-[#71856b]" /> Specialist reviewed</div>
                <SpecialistVideoCarousel />
                <div className="absolute -bottom-5 -right-4 max-w-[13rem] rounded-[1.3rem] bg-[#314237] p-5 text-[#f8f2e8] shadow-xl"><p className="font-serif text-2xl leading-none">Care is a craft.</p><p className="mt-2 text-xs leading-5 text-[#f8f2e8]/70">Thoughtful details, from the first question to the final rinse.</p></div>
              </div>
              <div className="max-w-xl">
                <p className="eyebrow">The IMSTEV method</p>
                <h2 className="mt-4 text-4xl leading-[.98] tracking-[-.055em] sm:text-6xl">Where technology meets the touch of an expert.</h2>
                <p className="mt-6 text-base leading-8 text-[#6e5b4c]">We believe the best care is both personal and precise. Start with a scan, bring your questions to a specialist, and leave with a ritual you can actually live with.</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {["Built for 4A–4C textures", "Guidance in plain language", "Human review when needed", "Thoughtful product edits"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#4d3b2e]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#71856b]/15 text-[#536b52]"><Check size={14} /></span>{item}</div>)}
                </div>
                <button type="button" className="outline-button mt-9" onClick={() => navigate("/telehealth")}>Talk to a specialist <ArrowUpRight size={16} /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="container-wide py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="eyebrow">Care, your way</p><h2 className="mt-3 text-4xl tracking-[-.05em] sm:text-5xl">One studio. Many ways to feel looked after.</h2></div>
            <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[#a45a2a]" onClick={() => navigate("/salon-booking")}>View all services <ChevronRight size={16} /></button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceCards.map((service) => {
              const Icon = service.icon;
              return <button key={service.title} type="button" onClick={() => navigate(service.href)} className="soft-card group min-h-[220px] p-6 text-left transition duration-300 hover:-translate-y-1 hover:bg-[#f0e6d7]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7d6bd] text-[#a45a2a] transition duration-300 group-hover:bg-[#24160d] group-hover:text-[#f8f2e8]"><Icon size={20} strokeWidth={1.6} /></span><span className="mt-9 block font-serif text-2xl leading-none">{service.title}</span><span className="mt-3 block text-sm leading-6 text-[#756253]">{service.body}</span><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#a45a2a]">Learn more <ArrowRight size={14} /></span></button>;
            })}
          </div>
        </section>

        <section className="olive-section py-16 sm:py-24">
          <div className="container-wide">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
              <div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#d9b277]">Find your next ritual</p><h2 className="mt-4 text-4xl leading-[.98] tracking-[-.05em] sm:text-6xl">The shelf, edited for you.</h2><p className="mt-6 max-w-md text-base leading-8 text-[#f8f2e8]/68">Discover Nigerian-made essentials and trusted care companions, organised around what your hair and skin are asking for.</p><button type="button" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f2d2a6] px-6 py-3.5 text-sm font-bold text-[#24160d] transition hover:-translate-y-0.5 hover:bg-[#ffe0b5]" onClick={() => navigate("/shop")}>Shop the edit <ShoppingBag size={16} /></button></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="relative min-h-[330px] overflow-hidden rounded-[1.7rem] bg-[#b98258]"><img src="/imstev-skin.jpg" alt="Luminous skin and natural texture" className="absolute inset-0 h-full w-full object-cover" /><div className="image-overlay absolute inset-0" /><div className="absolute bottom-6 left-6 right-6"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Skin ritual</span><p className="mt-2 font-serif text-3xl leading-none text-white">Glow, gently.</p></div></div><div className="flex min-h-[330px] flex-col justify-between rounded-[1.7rem] bg-[#f0dfc8] p-7 text-[#24160d]"><div><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a45a2a]">Hair ritual</span><p className="mt-3 font-serif text-4xl leading-[.95] tracking-[-.04em]">Made for the texture you live in.</p></div><div><div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#b9784a]"><CircleCheck size={15} /> A client note</div><p className="text-sm leading-6 text-[#6e5b4c]">“The first time a care plan felt like it was speaking to my actual hair.”</p><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-[#a45a2a]">— Ada, Abuja</p></div></div></div>
            </div>
          </div>
        </section>

        <section className="container-wide py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">From the community</p><h2 className="mt-3 text-4xl tracking-[-.05em] sm:text-5xl">Good care gets better when shared.</h2></div><button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[#a45a2a]" onClick={() => navigate("/community")}>Explore the community <ArrowUpRight size={16} /></button></div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">{communityStories.map((story, index) => <button key={story.title} type="button" onClick={() => navigate("/community")} className="group border-t border-[#24160d]/15 pt-5 text-left transition hover:border-[#a45a2a]"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a45a2a]">{story.tag}</span><span className="text-xs text-[#8b7766]">0{index + 1}</span></div><h3 className="mt-6 max-w-sm font-serif text-3xl leading-[1.02] tracking-[-.035em] transition group-hover:text-[#a45a2a]">{story.title}</h3><span className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#756253]">{story.read} <ArrowRight size={14} /></span></button>)}</div>
        </section>

        <section className="container-wide pb-16 sm:pb-24"><div className="relative overflow-hidden rounded-[2rem] bg-[#d8c4a8] px-6 py-12 text-center sm:px-12 sm:py-16"><div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#24160d]/10" /><div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full border border-[#24160d]/10" /><div className="relative mx-auto max-w-2xl"><p className="eyebrow">Your next chapter</p><h2 className="mt-4 text-4xl leading-[.98] tracking-[-.055em] sm:text-6xl">Come home to your natural beauty.</h2><p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[#6e5b4c]">Start with a scan, book a conversation, or simply take a look around. Your care story can begin anywhere.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" className="ink-button" onClick={() => navigate("/scan")}>Start my scan <ScanLine size={16} /></button><button type="button" className="outline-button" onClick={() => navigate("/salon-booking")}>Book the studio <CalendarDays size={16} /></button></div></div></div></section>

        <section className="container-wide pb-16"><div className="flex flex-col gap-6 rounded-[1.5rem] border border-[#24160d]/10 bg-[#f8f2e8] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7d6bd] text-[#a45a2a]"><Clock3 size={19} /></span><div><p className="font-bold">Find us in Bwari, Abuja</p><p className="mt-1 text-sm text-[#756253]">40 Law School Road · Tue–Sat · 8am–6pm · Sun · 2pm–6pm · Mon closed</p></div></div><div className="flex flex-wrap gap-3"><a className="outline-button !px-4 !py-2.5" href="tel:+2349033505038"><MapPin size={15} /> Get directions</a><button type="button" className="ink-button !px-4 !py-2.5" onClick={() => navigate("/salon-booking")}>Reserve a chair <CalendarDays size={15} /></button></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
