import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import Timeline from "./pages/Timeline";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Telehealth from "./pages/Telehealth";
import FamilyAccounts from "./pages/FamilyAccounts";
import CustomFormulation from "./pages/CustomFormulation";
import ClinicianDashboard from "./pages/ClinicianDashboard";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import SalonBooking from "./pages/SalonBooking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/telehealth" element={<Telehealth />} />
          <Route path="/family" element={<FamilyAccounts />} />
          <Route path="/formulation" element={<CustomFormulation />} />
          <Route path="/clinician" element={<ClinicianDashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/salon-booking" element={<SalonBooking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
