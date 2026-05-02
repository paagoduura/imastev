import { useCallback, useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Heart, Pill, AlertCircle, ArrowLeft, Plus, X } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(13, "Must be at least 13 years old").max(120, "Please enter a valid age"),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  phone: z.string().optional(),
  country: z.string().min(2, "Please enter your country"),
  skin_type: z.enum(["oily", "dry", "combination", "normal", "sensitive"]),
  fitzpatrick_scale: z.enum(["I", "II", "III", "IV", "V", "VI"]),
  is_pregnant: z.boolean().default(false),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        form.reset({
          full_name: profile.full_name || "",
          age: profile.age || 0,
          sex: (profile.sex as "male" | "female" | "other" | "prefer_not_to_say") || "prefer_not_to_say",
          phone: profile.phone || "",
          country: profile.country || "",
          skin_type: (profile.skin_type as "oily" | "dry" | "combination" | "normal" | "sensitive") || "normal",
          fitzpatrick_scale: (profile.fitzpatrick_scale as "I" | "II" | "III" | "IV" | "V" | "VI") || "III",
          is_pregnant: profile.is_pregnant || false,
        });

        setMedicalConditions(profile.medical_conditions || []);
        setMedications(profile.current_medications || []);
        setAllergies(profile.allergies || []);
      }
    } catch (error) {
      toast({
        title: "Error loading profile",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [form, navigate, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No authenticated user found");

      const profileData = {
        user_id: user.id,
        ...data,
        medical_conditions: medicalConditions,
        current_medications: medications,
        allergies: allergies,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (item: string, list: string[], setList: (list: string[]) => void, setInput: (value: string) => void) => {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeItem = (item: string, list: string[], setList: (list: string[]) => void) => {
    setList(list.filter(i => i !== item));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Profile Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage your personal and medical information</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="personal" className="text-xs sm:text-sm px-1 sm:px-3 py-2 flex flex-col sm:flex-row items-center gap-1">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="medical" className="text-xs sm:text-sm px-1 sm:px-3 py-2 flex flex-col sm:flex-row items-center gap-1">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Medical</span>
                </TabsTrigger>
                <TabsTrigger value="medications" className="text-xs sm:text-sm px-1 sm:px-3 py-2 flex flex-col sm:flex-row items-center gap-1">
                  <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Medications</span>
                </TabsTrigger>
                <TabsTrigger value="allergies" className="text-xs sm:text-sm px-1 sm:px-3 py-2 flex flex-col sm:flex-row items-center gap-1">
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Allergies</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Your basic profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
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
                            <FormLabel>Sex</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="skin_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skin Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="oily">Oily</SelectItem>
                                <SelectItem value="dry">Dry</SelectItem>
                                <SelectItem value="combination">Combination</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="sensitive">Sensitive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fitzpatrick_scale"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fitzpatrick Scale</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {["I", "II", "III", "IV", "V", "VI"].map((scale) => (
                                  <SelectItem key={scale} value={scale}>
                                    Type {scale}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical History</CardTitle>
                    <CardDescription>Chronic conditions and pregnancy status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FormLabel>Medical Conditions</FormLabel>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Add a condition..."
                          value={newCondition}
                          onChange={(e) => setNewCondition(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addItem(newCondition, medicalConditions, setMedicalConditions, setNewCondition);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => addItem(newCondition, medicalConditions, setMedicalConditions, setNewCondition)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {medicalConditions.map((condition) => (
                          <Badge key={condition} variant="secondary" className="gap-1">
                            {condition}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() => removeItem(condition, medicalConditions, setMedicalConditions)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="is_pregnant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Pregnancy Status</FormLabel>
                            <FormDescription>
                              This affects product recommendations and treatment safety
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Medications</CardTitle>
                    <CardDescription>Prescription drugs, supplements, and topical treatments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a medication..."
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addItem(newMedication, medications, setMedications, setNewMedication);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => addItem(newMedication, medications, setMedications, setNewMedication)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {medications.map((med) => (
                        <Badge key={med} variant="secondary" className="gap-1">
                          {med}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeItem(med, medications, setMedications)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="allergies" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Known Allergies</CardTitle>
                    <CardDescription>Help us recommend safe products and treatments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an allergy..."
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addItem(newAllergy, allergies, setAllergies, setNewAllergy);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => addItem(newAllergy, allergies, setAllergies, setNewAllergy)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="gap-1">
                          {allergy}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeItem(allergy, allergies, setAllergies)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/dashboard")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
