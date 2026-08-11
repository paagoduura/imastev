import { useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackButton } from "./components/layout/GlobalBackButton";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import Timeline from "./pages/Timeline";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Telehealth from "./pages/Telehealth";
import Consultation from "./pages/Consultation";
import FamilyAccounts from "./pages/FamilyAccounts";
import CustomFormulation from "./pages/CustomFormulation";
import ClinicianDashboard from "./pages/ClinicianDashboard";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import SalonBooking from "./pages/SalonBooking";
import Subscription from "./pages/Subscription";
import PaymentCallback from "./pages/PaymentCallback";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <GlobalBackButton />
      <Routes location={location} key={`${location.pathname}${location.search}${location.hash}`}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/telehealth" element={<Telehealth />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/family" element={<FamilyAccounts />} />
        <Route path="/formulation" element={<CustomFormulation />} />
        <Route path="/clinician" element={<ClinicianDashboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/community" element={<Community />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/salon-booking" element={<SalonBooking />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
