import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown } from "lucide-react";
import {
  MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN,
  MONTHLY_SCAN_SUBSCRIPTION_LIMIT,
  ONE_TIME_ANALYSIS_FEE_NGN,
} from "@/lib/scanPayments";

interface PaymentOption {
  id: "one-time" | "subscription";
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

interface PaymentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: "one-time" | "subscription") => void;
  isLoading?: boolean;
  userEmail: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "one-time",
    name: "Single Scan",
    price: ONE_TIME_ANALYSIS_FEE_NGN,
    period: "one-time",
    description: "Get your hair or skin analysis done today",
    icon: <Zap className="h-6 w-6" />,
    features: [
      "One complete AI analysis",
      "Detailed results and recommendations",
      "Personalized treatment plan",
      "Valid for this scan only",
    ]
  },
  {
    id: "subscription",
    name: "Monthly Premium",
    price: MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN,
    period: "monthly",
    description: `${MONTHLY_SCAN_SUBSCRIPTION_LIMIT} scans per month with full access`,
    icon: <Crown className="h-6 w-6" />,
    popular: true,
    features: [
      `${MONTHLY_SCAN_SUBSCRIPTION_LIMIT} scans every 30 days`,
      "Priority analysis processing",
      "Detailed results and recommendations",
      "Progress tracking across scans",
      "Valid for one monthly billing period",
    ],
  }
];

export function PaymentOptionsModal({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  userEmail
}: PaymentOptionsModalProps) {
  const [selectedOption, setSelectedOption] = useState<"one-time" | "subscription" | null>(null);

  const handleSelect = (option: "one-time" | "subscription") => {
    setSelectedOption(option);
  };

  const handleProceed = () => {
    if (!selectedOption) return;
    onSelect(selectedOption);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Payment Plan</DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for your hair/skin analysis
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-6">
          {PAYMENT_OPTIONS.map((option) => (
            <Card
              key={option.id}
              className={`relative cursor-pointer transition-all duration-300 ${
                selectedOption === option.id
                  ? "ring-2 ring-primary shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleSelect(option.id)}
            >
              {option.popular && (
                <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-primary to-secondary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">{option.icon}</div>
                  <CardTitle className="text-xl">{option.name}</CardTitle>
                </div>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(option.price)}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.period}</p>
                </div>

                <div className="space-y-2">
                  {option.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={selectedOption === option.id ? "default" : "outline"}
                  disabled={isLoading}
                >
                  {selectedOption === option.id ? "Selected" : "Select"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg text-sm">
          <p className="font-medium mb-2">Payment Method:</p>
          <p className="text-muted-foreground">
            You'll be redirected to Quickteller to complete your payment securely using your preferred payment method.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
            <Button
              className="flex-1"
              disabled={!selectedOption || isLoading}
              onClick={handleProceed}
            >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
