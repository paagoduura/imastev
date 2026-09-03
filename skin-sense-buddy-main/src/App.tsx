import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackButton } from "./components/layout/GlobalBackButton";
import { SEO, type SeoConfig } from "./components/SEO";
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Scan = lazy(() => import("./pages/Scan"));
const Results = lazy(() => import("./pages/Results"));
const Timeline = lazy(() => import("./pages/Timeline"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Telehealth = lazy(() => import("./pages/Telehealth"));
const Consultation = lazy(() => import("./pages/Consultation"));
const FamilyAccounts = lazy(() => import("./pages/FamilyAccounts"));
const CustomFormulation = lazy(() => import("./pages/CustomFormulation"));
const ClinicianDashboard = lazy(() => import("./pages/ClinicianDashboard"));
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const Inventory = lazy(() => import("./pages/Inventory"));
const SalonBooking = lazy(() => import("./pages/SalonBooking"));
const Subscription = lazy(() => import("./pages/Subscription"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Payment = lazy(() => import("./pages/Payment"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Community = lazy(() => import("./pages/Community"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PUBLIC_SEO: Record<string, SeoConfig> = {
  "/": { title: "IMSTEV NATURALS - Home of Nature's Beauty | Organic Hair Care & Salon", description: "Premium natural hair and skin care from Nigeria, with guided scans, specialist salon services, and personalized care plans for 4A-4C textures.", path: "/" },
  "/scan": { title: "Hair and Skin Scan | IMSTEV NATURALS", description: "Get personalized guidance for your hair, scalp, and skin with the IMSTEV NATURALS care scan.", path: "/scan" },
  "/hair-scan": { title: "Hair Scan | IMSTEV NATURALS", description: "Understand your hair, scalp, and texture with personalized guidance from the IMSTEV NATURALS Hair Scan.", path: "/hair-scan" },
  "/skin-scan": { title: "Skin Scan | IMSTEV NATURALS", description: "Understand your skin with personalized guidance from the IMSTEV NATURALS Skin Scan.", path: "/skin-scan" },
  "/salon-booking": { title: "Book a Salon Appointment | IMSTEV NATURALS", description: "Book specialist-led hair and beauty care at IMSTEV NATURALS in Bwari, Abuja.", path: "/salon-booking" },
  "/shop": { title: "Shop Natural Hair and Skin Care | IMSTEV NATURALS", description: "Explore Nigerian-made natural hair and skin care products selected for thoughtful, effective routines.", path: "/shop" },
  "/community": { title: "IMSTEV NATURALS Community", description: "Connect with a thoughtful community sharing natural hair, skin care, and beauty journeys.", path: "/community" },
  "/terms": { title: "Terms and Conditions | IMSTEV NATURALS", description: "Read the terms and conditions governing use of the IMSTEV NATURALS website, services, and products.", path: "/terms" },
  "/consultation": { title: "Specialist Consultation | IMSTEV NATURALS", description: "Speak with an IMSTEV NATURALS specialist for personal guidance across your hair and skin care journey.", path: "/consultation" },
  "/formulation": { title: "Custom Formulation | IMSTEV NATURALS", description: "Explore thoughtful custom formulation support for your hair and skin care needs at IMSTEV NATURALS.", path: "/formulation" },
  "/telehealth": { title: "Telehealth Consultation | IMSTEV NATURALS", description: "Access specialist-led hair and skin care guidance through an IMSTEV NATURALS telehealth consultation.", path: "/telehealth" },
  "/family": { title: "Family Care | IMSTEV NATURALS", description: "Manage thoughtful hair and skin care support for the people who matter to you with IMSTEV NATURALS.", path: "/family" },
};

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollingElement = document.scrollingElement ?? root;
    const previousScrollBehavior = root.style.scrollBehavior;

    // Temporarily disable smooth scrolling so route changes always snap to top.
    root.style.scrollBehavior = "auto";

    const resetScroll = () => {
      root.scrollTop = 0;
      body.scrollTop = 0;
      scrollingElement.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    resetScroll();

    const rafId = window.requestAnimationFrame(resetScroll);
    const timeoutId = window.setTimeout(() => {
      resetScroll();
      root.style.scrollBehavior = previousScrollBehavior;
    }, 80);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [location.pathname, location.search]);

  return null;
}

function RouteFallback() {
  return <div className="grid min-h-screen place-items-center bg-[#f5f0e7] px-6 text-center text-sm text-[#756253]">Loading your care space…</div>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      {PUBLIC_SEO[location.pathname] ? <SEO {...PUBLIC_SEO[location.pathname]} /> : null}
      <ScrollToTop />
      <GlobalBackButton />
      <Suspense fallback={<RouteFallback />}>
      <Routes location={location} key={`${location.pathname}${location.search}${location.hash}`}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
        <Route path="/telehealth" element={<Telehealth />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/family" element={<FamilyAccounts />} />
        <Route path="/formulation" element={<CustomFormulation />} />
        <Route path="/clinician" element={<ClinicianDashboard />} />
        <Route path="/hair-scan" element={<Scan />} />
        <Route path="/skin-scan" element={<Scan />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/community" element={<Community />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/salon-booking" element={<SalonBooking />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
