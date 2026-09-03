import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Phone, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const services = [
  { title: "Natural hair care", body: "Thoughtful care for coils, locs, braids, and natural textures at every stage." },
  { title: "Hair styling", body: "Considered styling shaped around your hair’s condition, texture, and everyday needs." },
  { title: "Hair treatments", body: "Targeted salon treatments to support a healthier, more comfortable hair-care routine." },
  { title: "Protective styles", body: "Protective styling with attention to comfort, scalp care, and maintenance between visits." },
];

const faqs = [
  ["Where is IMSTEV NATURALS located?", "Our salon operates in Bwari, Abuja, Nigeria. The booking page provides the current location and appointment details."],
  ["What type of hair does IMSTEV NATURALS care for?", "We focus on African hair textures, including natural coils, locs, braids, and protective styles. Your appointment is shaped around your individual hair needs."],
  ["How do I book an appointment?", "Choose a service, select an available date and time, enter your contact details, and continue through the booking flow on our salon booking page."],
  ["What are the salon opening hours?", "Appointments run Tuesday to Saturday from 8:00 AM to 6:00 PM and Sunday from 2:00 PM to 6:00 PM. Monday is the salon’s closed day."],
];

export default function NaturalHairSalonAbuja() {
  return (
    <div className="min-h-screen bg-[#f8f2e8] text-[#24160d]">
      <Navbar />
      <main>
        <section className="container-wide px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">Bwari · Abuja · Nigeria</p>
              <h1 className="mt-5 max-w-3xl text-5xl leading-[.95] tracking-[-.06em] sm:text-7xl">Natural hair salon in Abuja, with care that starts with understanding.</h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[#6e5b4c] sm:text-lg">IMSTEV NATURALS is a specialist-led natural hair salon in Bwari, Abuja, offering thoughtful hair care, styling, treatments, and protective styles for African hair textures.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/salon-booking" className="ink-button justify-center">Book an appointment <CalendarDays size={17} /></Link>
                <a href="tel:+2348110523763" className="outline-button justify-center"><Phone size={16} /> Call the salon</a>
              </div>
            </div>
            <div className="rounded-[2rem] bg-[#d8c4a8] p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#6e4d34]">A considered salon experience</p>
              <p className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">Professional natural hair care in a welcoming Abuja studio.</p>
              <div className="mt-8 grid gap-4 border-t border-[#24160d]/15 pt-6 text-sm text-[#574637]">
                <p className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-[#a45a2a]" /> Bwari, Abuja, Federal Capital Territory</p>
                <p className="flex gap-3"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#a45a2a]" /> Tue–Sat 8:00 AM–6:00 PM · Sun 2:00 PM–6:00 PM</p>
                <p className="flex gap-3"><Scissors size={18} className="mt-0.5 shrink-0 text-[#a45a2a]" /> Monday closed · Appointment-led care</p>
              </div>
            </div>
          </div>
        </section>

        <section className="warm-section px-4 py-16 sm:py-24">
          <div className="container-wide">
            <div className="max-w-2xl">
              <p className="eyebrow">Our salon services</p>
              <h2 className="mt-4 text-4xl leading-[.98] tracking-[-.05em] sm:text-6xl">Care for your texture, not a template.</h2>
              <p className="mt-5 text-base leading-8 text-[#6e5b4c]">Start with the service that matches what your hair needs today. We keep the conversation clear and the care personal.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => <article key={service.title} className="rounded-[1.5rem] border border-[#24160d]/10 bg-[#f8f2e8] p-6"><div className="grid h-10 w-10 place-items-center rounded-full bg-[#d8c4a8] text-[#a45a2a]"><Check size={18} /></div><h3 className="mt-6 font-serif text-2xl leading-none">{service.title}</h3><p className="mt-3 text-sm leading-6 text-[#6e5b4c]">{service.body}</p></article>)}
            </div>
          </div>
        </section>

        <section className="container-wide px-4 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
            <div><p className="eyebrow">Before you visit</p><h2 className="mt-4 text-4xl leading-[.98] tracking-[-.05em] sm:text-5xl">A simple way to begin.</h2><p className="mt-5 text-base leading-8 text-[#6e5b4c]">Choose your service, select a time that works, and share the details that help us prepare for your visit.</p><Link to="/salon-booking" className="ink-button mt-7">Choose a time <ArrowRight size={16} /></Link></div>
            <div className="divide-y divide-[#24160d]/10 rounded-[1.5rem] border border-[#24160d]/10 bg-white/60 px-6 sm:px-8">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer list-none pr-6 font-semibold marker:hidden">{question}</summary><p className="mt-3 max-w-2xl text-sm leading-7 text-[#6e5b4c]">{answer}</p></details>)}</div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
