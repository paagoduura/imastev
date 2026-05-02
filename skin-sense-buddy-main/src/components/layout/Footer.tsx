import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Music2, Mail, Phone, MapPin, Sparkles } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Community", href: "/community" },
    { label: "Salon", href: "/salon-booking" },
    { label: "Shop", href: "/shop" },
    { label: "AI Scan", href: "/scan" },
  ];

  const services = [
    { label: "Hair Analysis", href: "/scan" },
    { label: "Skin Analysis", href: "/scan" },
    { label: "Salon Booking", href: "/salon-booking" },
    { label: "Custom Formulations", href: "/formulation" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/15 bg-primary text-white">
      <div className="absolute inset-0 bg-black/5" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="lg:col-span-1">
              <div className="mb-5 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/15 blur-lg" />
                  <img
                    src="/imstev-logo.jpeg"
                    alt="IMSTEV NATURALS"
                    className="relative h-14 w-14 rounded-full object-cover ring-2 ring-primary/15"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white text-primary">IMSTEV NATURALS</h3>
                  <p className="text-sm font-medium text-white/80">Home of Nature&apos;s Beauty</p>
                </div>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-white/75">
                Nigeria&apos;s premier AI-powered hair and skin analysis platform, specializing in 4A-4C African hair types with personalized treatment plans and organic solutions.
              </p>
              <div className="flex items-center gap-3">
                {[Facebook, Instagram, Twitter, Linkedin, Youtube, Music2].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-300 hover:bg-white hover:text-primary"
                    aria-label={`Social link ${index + 1}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <Sparkles className="h-4 w-4 text-white" />
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-sm text-white/75 transition-colors duration-300 hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 transition-colors group-hover:bg-white" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <Sparkles className="h-4 w-4 text-white" />
                Our Services
              </h4>
              <ul className="space-y-3">
                {services.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-sm text-white/75 transition-colors duration-300 hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 transition-colors group-hover:bg-white" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <Sparkles className="h-4 w-4 text-white" />
                Contact Us
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-white/75">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-white" />
                  <span>40 Law School Road, Opp FirstBank, Bwari, Abuja, Nigeria</span>
                </li>
                <li>
                  <a
                    href="tel:+2349033505038"
                    className="flex items-center gap-3 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0 text-white" />
                    <span>+234 903 350 5038</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@imstevnaturals.com"
                    className="flex items-center gap-3 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0 text-white" />
                    <span>contact@imstevnaturals.com</span>
                  </a>
                </li>
              </ul>

              <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="mb-1 text-xs font-medium text-white">Salon Hours</p>
                <p className="text-xs text-white/75">Monday: Closed</p>
                <p className="text-xs text-white/75">Tuesday - Saturday: 2PM onward</p>
                <p className="text-xs text-white/75">Sunday: By appointment from 2PM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 py-6 sm:py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-white/75 md:text-left">
              &copy; {currentYear} IMSTEV NATURALS. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm md:justify-end">
              <Link to="#" className="text-white/75 transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link to="#" className="text-white/75 transition-colors hover:text-white">
                Terms of Service
              </Link>
              <Link to="#" className="text-white/75 transition-colors hover:text-white">
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-white/70">
           
          </div>
        </div>
      </div>
    </footer>
  );
}
