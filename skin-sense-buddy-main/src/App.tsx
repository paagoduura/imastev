import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import { GlobalBackButton } from "./components/layout/GlobalBackButton";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <GlobalBackButton />
        <Routes>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
