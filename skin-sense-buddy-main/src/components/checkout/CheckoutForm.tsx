import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  specialInstructions: string;
}

interface CheckoutFormProps {
  userEmail?: string;
  userName?: string;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading: boolean;
  cartTotal: number;
}

type CountryStateEntry = {
  name?: string;
  states?: Array<{ name?: string }>;
};

type CountryStateResponse = {
  data?: CountryStateEntry[];
};

export function CheckoutForm({ userEmail = "", userName = "", onSubmit, isLoading, cartTotal }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: userName || "",
    email: userEmail || "",
    phone: "",
    deliveryAddress: "",
    country: "Nigeria",
    city: "",
    state: "",
    zipCode: "",
    specialInstructions: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [countryOptions, setCountryOptions] = useState<string[]>(["Nigeria"]);
  const [stateOptions, setStateOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch("https://countriesnow.space/api/v0.1/countries/states");
        if (!response.ok) throw new Error("Failed to load countries");
        const payload = (await response.json()) as CountryStateResponse;
        const countries = Array.isArray(payload?.data) ? payload.data : [];
        const countryNames = countries
          .map((entry) => String(entry?.name || "").trim())
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));
        const mappedStates: Record<string, string[]> = {};
        countries.forEach((entry) => {
          const name = String(entry?.name || "").trim();
          if (!name) return;
          const states = Array.isArray(entry?.states) ? entry.states : [];
          mappedStates[name] = states
            .map((state) => String(state?.name || "").trim())
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b));
        });

        setCountryOptions(countryNames.length ? countryNames : ["Nigeria"]);
        setStateOptions(mappedStates);
        setFormData(prev => {
          const nextCountry = countryNames.includes(prev.country)
            ? prev.country
            : (countryNames[0] || "Nigeria");
          const nextStates = mappedStates[nextCountry] || [];
          const nextState = nextStates.length
            ? (nextStates.includes(prev.state) ? prev.state : "")
            : "N/A";
          return {
            ...prev,
            country: nextCountry,
            state: nextState,
            city: prev.city,
          };
        });
      } catch (error) {
        console.warn("Failed to load countries list. Falling back to Nigeria only.");
        setCountryOptions(["Nigeria"]);
        setStateOptions({
          Nigeria: [
            "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
            "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
            "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
            "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
            "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
          ],
        });
        setFormData(prev => ({
          ...prev,
          country: "Nigeria",
          state: "",
          city: "",
        }));
      }
    };

    loadCountries();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Valid email is required";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.country === "Nigeria" && !/^(\+234|0)[0-9]{10}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Valid Nigerian phone number required";
    }
    if (!formData.deliveryAddress.trim()) newErrors.deliveryAddress = "Delivery address is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const nextStates = stateOptions[value] || [];
    setFormData(prev => ({
      ...prev,
      country: value,
      state: nextStates.length ? "" : "N/A",
      city: "",
    }));
    if (errors.country) {
      setErrors(prev => ({ ...prev, country: "" }));
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, state: value }));
    if (errors.state) {
      setErrors(prev => ({ ...prev, state: "" }));
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-purple-600/10 to-amber-600/10 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="w-5 h-5 text-purple-600" />
          Delivery Information
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium mb-2 block">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className={`h-11 rounded-lg ${errors.fullName ? 'border-red-500' : ''}`}
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className={`h-11 rounded-lg ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-600" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 903 350 5038"
              className={`h-11 rounded-lg ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-slate-500 mt-1">Format: +234 or 0 followed by 10 digits</p>
          </div>

          <div>
            <Label htmlFor="deliveryAddress" className="text-sm font-medium mb-2 block">Delivery Address *</Label>
            <Textarea
              id="deliveryAddress"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleChange}
              placeholder="Street address, apartment, etc."
              className={`h-20 rounded-lg resize-none ${errors.deliveryAddress ? 'border-red-500' : ''}`}
            />
            {errors.deliveryAddress && <p className="text-xs text-red-500 mt-1">{errors.deliveryAddress}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="country" className="text-sm font-medium mb-2 block">Country *</Label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleCountryChange}
                className={`h-11 rounded-lg w-full border border-input bg-background px-3 text-sm ${errors.country ? 'border-red-500' : ''}`}
              >
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
            </div>

            <div>
              <Label htmlFor="state" className="text-sm font-medium mb-2 block">State *</Label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleStateChange}
                className={`h-11 rounded-lg w-full border border-input bg-background px-3 text-sm ${errors.state ? 'border-red-500' : ''}`}
              >
                <option value="">Select state</option>
                {(stateOptions[formData.country] || []).length === 0 ? (
                  <option value="N/A">N/A</option>
                ) : (
                  (stateOptions[formData.country] || []).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))
                )}
              </select>
              {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
            </div>

            <div>
              <Label htmlFor="city" className="text-sm font-medium mb-2 block">City *</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className={`h-11 rounded-lg ${errors.city ? 'border-red-500' : ''}`}
              />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">ZIP Code *</Label>
            <Input
              id="zipCode"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              placeholder="ZIP/Postal"
              className={`h-11 rounded-lg ${errors.zipCode ? 'border-red-500' : ''}`}
            />
            {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
          </div>

          <div>
            <Label htmlFor="specialInstructions" className="text-sm font-medium mb-2 block">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              placeholder="Any special requests or delivery instructions?"
              className="h-16 rounded-lg resize-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Order Total:</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-600 bg-clip-text text-transparent">
                ₦{cartTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-semibold text-lg shadow-lg shadow-purple-500/30 transition-all duration-300 rounded-xl"
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Your details will be securely sent to our team at contact@imstevnaturals.com
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
