import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, User, Palette, Sparkles, Droplets, FlaskConical, Heart, Shield } from "lucide-react";
import { HairProfileStep } from "@/components/onboarding/HairProfileStep";
import { cn } from "@/lib/utils";

const onboardingSchema = z.object({
  // Basic info
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(13, "Must be at least 13 years old").max(120, "Please enter a valid age"),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    required_error: "Please select your sex",
  }),
  phone: z.string().optional(),
  country: z.string().min(2, "Please enter your country"),
  // Skin profile
  skin_type: z.enum(["oily", "dry", "combination", "normal", "sensitive"], {
    required_error: "Please select your skin type",
  }),
  fitzpatrick_scale: z.enum(["I", "II", "III", "IV", "V", "VI"], {
    required_error: "Please select your Fitzpatrick scale",
  }),
  // Hair profile
  hair_type: z.string().optional(),
  hair_porosity: z.string().optional(),
  hair_density: z.string().optional(),
  hair_length: z.string().optional(),
  scalp_condition: z.string().optional(),
  hair_concerns: z.array(z.string()).optional(),
  is_chemically_treated: z.boolean().default(false),
  chemical_treatments: z.array(z.string()).optional(),
  last_chemical_treatment: z.string().optional(),
  // Medical
  medical_conditions: z.string().optional(),
  current_medications: z.string().optional(),
  allergies: z.string().optional(),
  is_pregnant: z.boolean().default(false),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, title: "Basic Info", icon: User, description: "Your personal details" },
  { id: 2, title: "Skin Profile", icon: Palette, description: "Skin type & tone" },
  { id: 3, title: "Hair Type", icon: Sparkles, description: "Texture & density" },
  { id: 4, title: "Hair Health", icon: Droplets, description: "Porosity & concerns" },
  { id: 5, title: "Treatments", icon: FlaskConical, description: "Chemical history" },
  { id: 6, title: "Medical", icon: Heart, description: "Health conditions" },
  { id: 7, title: "Safety", icon: Shield, description: "Allergies & final" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      is_pregnant: false,
      is_chemically_treated: false,
      hair_concerns: [],
      chemical_treatments: [],
    },
  });

  const totalSteps = STEPS.length;

  const onSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const profileData = {
        user_id: user.id,
        full_name: data.full_name,
        age: data.age,
        sex: data.sex,
        phone: data.phone || null,
        country: data.country,
        skin_type: data.skin_type,
        fitzpatrick_scale: data.fitzpatrick_scale,
        // Hair fields
        hair_type: data.hair_type || null,
        hair_porosity: data.hair_porosity || null,
        hair_density: data.hair_density || null,
        hair_length: data.hair_length || null,
        scalp_condition: data.scalp_condition || null,
        hair_concerns: data.hair_concerns || [],
        is_chemically_treated: data.is_chemically_treated,
        chemical_treatments: data.chemical_treatments || [],
        last_chemical_treatment: data.last_chemical_treatment || null,
        // Medical fields
        medical_conditions: data.medical_conditions 
          ? data.medical_conditions.split(",").map(c => c.trim()).filter(Boolean)
          : [],
        current_medications: data.current_medications
          ? data.current_medications.split(",").map(m => m.trim()).filter(Boolean)
          : [],
        allergies: data.allergies
          ? data.allergies.split(",").map(a => a.trim()).filter(Boolean)
          : [],
        is_pregnant: data.is_pregnant,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Profile completed!",
        description: "Your skin and hair profile has been successfully set up.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fields = getFieldsForStep(step);
    const isValid = await form.trigger(fields);
    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getFieldsForStep = (stepNumber: number): (keyof OnboardingFormData)[] => {
    switch (stepNumber) {
      case 1:
        return ["full_name", "age", "sex", "phone", "country"];
      case 2:
        return ["skin_type", "fitzpatrick_scale"];
      case 3:
        return ["hair_type", "hair_density", "hair_length"];
      case 4:
        return ["hair_porosity", "scalp_condition", "hair_concerns"];
      case 5:
        return ["is_chemically_treated", "chemical_treatments", "last_chemical_treatment"];
      case 6:
        return ["medical_conditions", "current_medications"];
      case 7:
        return ["allergies", "is_pregnant"];
      default:
        return [];
    }
  };

  const currentStepInfo = STEPS[step - 1];
  const StepIcon = currentStepInfo?.icon || User;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-2">
        <CardHeader className="space-y-4 pb-4">
          {/* Step indicator circles */}
          <div className="flex items-center justify-center gap-1 mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i + 1 === step;
              const isCompleted = i + 1 < step;
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                      isActive && "bg-primary text-primary-foreground shadow-lg scale-110",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "w-6 h-0.5 mx-0.5 transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <StepIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{currentStepInfo?.title}</CardTitle>
                <CardDescription>{currentStepInfo?.description}</CardDescription>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {step} / {totalSteps}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 min-h-[400px]">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="25" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sex *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+234 xxx xxx xxxx" {...field} />
                        </FormControl>
                        <FormDescription>Optional - for appointment reminders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nigeria" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Skin Profile */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <FormField
                    control={form.control}
                    name="skin_type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">Skin Type *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid md:grid-cols-2 gap-3"
                          >
                            {[
                              { value: "oily", label: "Oily", description: "Shiny appearance, enlarged pores" },
                              { value: "dry", label: "Dry", description: "Tight feeling, flaky patches" },
                              { value: "combination", label: "Combination", description: "Oily T-zone, dry cheeks" },
                              { value: "normal", label: "Normal", description: "Balanced, minimal issues" },
                              { value: "sensitive", label: "Sensitive", description: "Easily irritated, reactive" },
                            ].map((type) => (
                              <FormItem key={type.value}>
                                <FormControl>
                                  <div
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                      field.value === type.value
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    )}
                                    onClick={() => field.onChange(type.value)}
                                  >
                                    <RadioGroupItem value={type.value} id={type.value} />
                                    <div>
                                      <FormLabel htmlFor={type.value} className="font-medium cursor-pointer capitalize">
                                        {type.label}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">{type.description}</p>
                                    </div>
                                  </div>
                                </FormControl>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fitzpatrick_scale"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">Fitzpatrick Skin Scale *</FormLabel>
                        <FormDescription>
                          This helps us provide accurate analysis for your skin tone
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid md:grid-cols-2 gap-3"
                          >
                            {[
                              { value: "I", label: "Type I", description: "Very fair, always burns" },
                              { value: "II", label: "Type II", description: "Fair, usually burns" },
                              { value: "III", label: "Type III", description: "Medium, sometimes burns" },
                              { value: "IV", label: "Type IV", description: "Olive, rarely burns" },
                              { value: "V", label: "Type V", description: "Brown, very rarely burns" },
                              { value: "VI", label: "Type VI", description: "Dark brown to black" },
                            ].map((type) => (
                              <FormItem key={type.value}>
                                <FormControl>
                                  <div
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                      field.value === type.value
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    )}
                                    onClick={() => field.onChange(type.value)}
                                  >
                                    <RadioGroupItem value={type.value} id={`fitz-${type.value}`} />
                                    <div>
                                      <FormLabel htmlFor={`fitz-${type.value}`} className="font-medium cursor-pointer">
                                        {type.label}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">{type.description}</p>
                                    </div>
                                  </div>
                                </FormControl>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Hair Type */}
              {step === 3 && <HairProfileStep form={form} subStep="type" />}

              {/* Step 4: Hair Porosity & Concerns */}
              {step === 4 && <HairProfileStep form={form} subStep="porosity" />}

              {/* Step 5: Chemical Treatments */}
              {step === 5 && <HairProfileStep form={form} subStep="chemical" />}

              {/* Step 6: Medical History */}
              {step === 6 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">Medical History</h3>
                    <p className="text-sm text-muted-foreground">
                      This helps us provide safe treatment recommendations
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="medical_conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical Conditions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Diabetes, Hypertension, Eczema (separate with commas)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          List any chronic conditions or skin/hair-related diagnoses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="current_medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Metformin, Lisinopril, Tretinoin (separate with commas)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include prescription medications, supplements, and topical treatments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 7: Allergies & Final */}
              {step === 7 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">Safety & Allergies</h3>
                    <p className="text-sm text-muted-foreground">
                      Final step to ensure your safety
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Penicillin, Salicylic acid, Fragrances, Parabens (separate with commas)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This helps us recommend safe products and treatments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_pregnant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 p-4 bg-muted/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Are you currently pregnant?</FormLabel>
                          <FormDescription>
                            This affects product recommendations and treatment options
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-primary">You're all set!</p>
                        <p className="text-sm text-muted-foreground">
                          Your complete skin and hair profile will enable personalized analysis, 
                          treatment recommendations, and product suggestions tailored specifically for you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1 || loading}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {step < totalSteps ? (
                  <Button type="button" onClick={nextStep} className="gap-2">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading} className="gap-2 min-w-[180px]">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Profile
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
