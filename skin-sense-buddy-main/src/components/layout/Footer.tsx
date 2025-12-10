import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Sparkles, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "AI Scan", href: "/scan" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Timeline", href: "/timeline" },
  ];

  const services = [
    { label: "Hair Analysis", href: "/scan" },
    { label: "Skin Analysis", href: "/scan" },
    { label: "Salon Booking", href: "/telehealth" },
    { label: "Custom Formulations", href: "/custom-formulation" },
  ];

  const shop = [
    { label: "All Products", href: "/shop" },
    { label: "Hair Care", href: "/shop" },
    { label: "Skin Care", href: "/shop" },
    { label: "Organic Oils", href: "/shop" },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full blur-lg opacity-60" />
                  <img 
                    src="/imstev-logo.png" 
                    alt="IMSTEV NATURALS" 
                    className="relative h-14 w-14 rounded-full object-cover ring-2 ring-purple-500/30"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                    IMSTEV NATURALS
                  </h3>
                  <p className="text-sm text-purple-300/80 font-medium">Home of Nature's Beauty</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Nigeria's premier AI-powered hair and skin analysis platform, specializing in 4A-4C African hair types with personalized treatment plans and organic solutions.
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-amber-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-amber-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-amber-500 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.href}
                      className="text-slate-400 hover:text-purple-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 group-hover:bg-purple-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Our Services
              </h4>
              <ul className="space-y-3">
                {services.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.href}
                      className="text-slate-400 hover:text-amber-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 group-hover:bg-amber-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Contact Us
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>IMSTEV NATURALS Hair Specialist Salon, Lagos, Nigeria</span>
                </li>
                <li>
                  <a 
                    href="tel:+2348000000000" 
                    className="flex items-center gap-3 text-sm text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>+234 800 000 0000</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:hello@imstevnaturals.com" 
                    className="flex items-center gap-3 text-sm text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>hello@imstevnaturals.com</span>
                  </a>
                </li>
              </ul>
              
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-amber-900/30 border border-purple-500/20">
                <p className="text-xs text-slate-300 font-medium mb-1">Salon Hours</p>
                <p className="text-xs text-slate-400">Mon - Sat: 9AM - 7PM</p>
                <p className="text-xs text-slate-400">Sunday: By Appointment</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm text-center md:text-left">
              &copy; {currentYear} IMSTEV NATURALS. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-600">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-purple-500 fill-purple-500" />
            <span>for beautiful hair & skin</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
