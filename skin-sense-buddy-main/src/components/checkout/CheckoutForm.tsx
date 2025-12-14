import { useState } from "react";
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
  billingAddress: string;
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

export function CheckoutForm({ userEmail = "", userName = "", onSubmit, isLoading, cartTotal }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: userName || "",
    email: userEmail || "",
    phone: "",
    billingAddress: "",
    city: "Abuja",
    state: "FCT",
    zipCode: "",
    specialInstructions: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Valid email is required";
    }
    if (!formData.phone.trim() || !/^(\+234|0)[0-9]{10}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Valid Nigerian phone number required";
    }
    if (!formData.billingAddress.trim()) newErrors.billingAddress = "Billing address is required";
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

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-purple-600/10 to-amber-600/10 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="w-5 h-5 text-purple-600" />
          Delivery & Billing Information
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
            <Label htmlFor="billingAddress" className="text-sm font-medium mb-2 block">Billing Address *</Label>
            <Textarea
              id="billingAddress"
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleChange}
              placeholder="Street address, apartment, etc."
              className={`h-20 rounded-lg resize-none ${errors.billingAddress ? 'border-red-500' : ''}`}
            />
            {errors.billingAddress && <p className="text-xs text-red-500 mt-1">{errors.billingAddress}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

            <div>
              <Label htmlFor="state" className="text-sm font-medium mb-2 block">State</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled
                className="h-11 rounded-lg bg-slate-100"
              />
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
