import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, Droplets, Heart, Leaf, Loader2, MapPin, Pill, Plus, Scissors, ShieldCheck, UserRound, X } from "lucide-react";

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

type ProfileRecord = Partial<ProfileFormData> & {
  email?: string | null;
  location?: string | null;
  hair_type?: string | null;
  hair_porosity?: string | null;
  hair_density?: string | null;
  hair_length?: string | null;
  medical_conditions?: string[] | null;
  current_medications?: string[] | null;
  allergies?: string[] | null;
};

const defaultProfile: ProfileFormData = {
  full_name: "",
  age: 18,
  sex: "prefer_not_to_say",
  phone: "",
  country: "Nigeria",
  skin_type: "normal",
  fitzpatrick_scale: "III",
  is_pregnant: false,
};

const fieldClass = "h-12 rounded-2xl border-[#3b271b]/15 bg-[#fbf7f1] text-[#3b271b] placeholder:text-[#3b271b]/35 focus:border-[#8b5e3c] focus:ring-[#8b5e3c]/15";
const selectClass = "h-12 w-full rounded-2xl border border-[#3b271b]/15 bg-[#fbf7f1] px-4 text-sm text-[#3b271b] outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#8b5e3c]/15";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");

export default function Profile({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [accountEmail, setAccountEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
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
    defaultValues: defaultProfile,
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthenticated(false);
        return;
      }

      setAccountEmail(user.email || "");
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Profile record is not available yet:", error);
        form.reset(defaultProfile);
        return;
      }

      const nextProfile = (profileData as ProfileRecord | null) || null;
      setProfile(nextProfile);
      form.reset({
        full_name: nextProfile?.full_name || "",
        age: nextProfile?.age || 18,
        sex: nextProfile?.sex || "prefer_not_to_say",
        phone: nextProfile?.phone || "",
        country: nextProfile?.country || nextProfile?.location || "Nigeria",
        skin_type: nextProfile?.skin_type || "normal",
        fitzpatrick_scale: nextProfile?.fitzpatrick_scale || "III",
        is_pregnant: nextProfile?.is_pregnant || false,
      });
      setMedicalConditions(nextProfile?.medical_conditions || []);
      setMedications(nextProfile?.current_medications || []);
      setAllergies(nextProfile?.allergies || []);
    } catch (error) {
      toast({
        title: "Could not load your profile",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    void loadProfile();
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
        allergies,
      };
      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;
      setProfile((current) => ({ ...current, ...data, medical_conditions: medicalConditions, current_medications: medications, allergies }));
      toast({ title: "Profile saved", description: "Your care record is up to date." });
    } catch (error) {
      toast({ title: "Could not save profile", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (item: string, list: string[], setList: (next: string[]) => void, setInput: (next: string) => void) => {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeItem = (item: string, list: string[], setList: (next: string[]) => void) => {
    setList(list.filter((entry) => entry !== item));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f3ec] text-[#3b271b]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#8b5e3c]"><Loader2 className="h-5 w-5 animate-spin" /> Preparing your care record</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#f8f3ec] px-4 py-8 text-[#3b271b]">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <Card className="w-full rounded-[30px] border-[#3b271b]/10 bg-white shadow-[0_24px_70px_rgba(59,39,27,0.12)]">
            <CardContent className="space-y-6 p-8 text-center sm:p-12">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e7d6bd] text-[#8b5e3c]"><UserRound className="h-7 w-7" /></div>
              <div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#8b5e3c]">Your care record</p><h1 className="font-display text-3xl">Sign in to view your profile.</h1><p className="text-sm leading-6 text-[#3b271b]/60">Your preferences, safety notes, and care history belong in one private place.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center"><Button onClick={() => navigate("/auth")} className="h-12 rounded-full bg-[#3b271b] px-6 text-[#f8f3ec] hover:bg-[#513622]">Go to sign in</Button><Button variant="outline" onClick={() => navigate("/")} className="h-12 rounded-full border-[#3b271b]/20">Back to home</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const name = profile?.full_name || form.getValues("full_name") || accountEmail.split("@")[0] || "Care member";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IM";
  const hairSnapshot = profile?.hair_type ? `Type ${profile.hair_type.replace(/^type\s*/i, "")}` : "Add your hair profile";
  const skinSnapshot = profile?.skin_type ? profile.skin_type.charAt(0).toUpperCase() + profile.skin_type.slice(1) : "Add your skin type";

  return (
    <div className={`${embedded ? "w-full" : "min-h-screen"} bg-[#f8f3ec] text-[#3b271b]`}>
      {!embedded && <Navbar />}
      <main>
        <section className="border-b border-[#3b271b]/10 bg-[#f8f3ec]">
          <div className="container-wide px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
            <button type="button" onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#8b5e3c] transition hover:text-[#3b271b]"><ArrowLeft className="h-4 w-4" /> Back to my care</button>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#8b5e3c]">Your care record</p><h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[.94] tracking-[-.045em] sm:text-6xl">A profile that keeps your routine in view.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#3b271b]/65">Keep the details that help our specialists care for you thoughtfully—from your texture and skin type to the safety notes that matter.</p></div>
              <div className="rounded-[28px] bg-[#3b271b] p-6 text-[#f8f3ec] shadow-[0_24px_70px_rgba(59,39,27,0.16)] sm:p-7"><div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#d8c4a8] font-display text-2xl text-[#3b271b]">{initials}</div><div className="min-w-0"><p className="font-display text-2xl leading-none">{name}</p><p className="mt-2 truncate text-sm text-[#f8f3ec]/60">{accountEmail || "IMSTEV care member"}</p></div></div><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#f8f3ec]/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#f8f3ec]/75"><ShieldCheck className="h-3.5 w-3.5 text-[#d8c4a8]" /> Private record</span><span className="inline-flex items-center gap-2 rounded-full border border-[#f8f3ec]/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#f8f3ec]/75"><Leaf className="h-3.5 w-3.5 text-[#d8c4a8]" /> Made for your routine</span></div></div>
            </div>
          </div>
        </section>

        <section className="container-wide px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <SnapshotCard icon={<Scissors className="h-5 w-5" />} label="Hair profile" value={hairSnapshot} detail={profile?.hair_porosity ? `${profile.hair_porosity} porosity` : "Texture and density notes"} />
            <SnapshotCard icon={<Droplets className="h-5 w-5" />} label="Skin profile" value={skinSnapshot} detail={profile?.fitzpatrick_scale ? `Type ${profile.fitzpatrick_scale} tone note` : "Skin type and tone notes"} />
            <SnapshotCard icon={<Heart className="h-5 w-5" />} label="Safety notes" value={`${medicalConditions.length + medications.length + allergies.length} saved`} detail="Conditions, medicines, and allergies" />
          </div>
        </section>

        <section className="container-wide px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="personal" className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
                <div className="lg:sticky lg:top-24"><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#8b5e3c]">Keep it current</p><h2 className="mt-2 font-display text-3xl">Your details, your way.</h2></div><TabsList className="grid h-auto grid-cols-2 gap-2 rounded-[24px] bg-transparent p-0 lg:grid-cols-1"><TabsTrigger value="personal" className="justify-start rounded-2xl border border-[#3b271b]/10 bg-white/70 px-4 py-3 text-left text-sm data-[state=active]:bg-[#3b271b] data-[state=active]:text-[#f8f3ec]"><UserRound className="mr-2 h-4 w-4" /> Personal</TabsTrigger><TabsTrigger value="medical" className="justify-start rounded-2xl border border-[#3b271b]/10 bg-white/70 px-4 py-3 text-left text-sm data-[state=active]:bg-[#3b271b] data-[state=active]:text-[#f8f3ec]"><Heart className="mr-2 h-4 w-4" /> Medical</TabsTrigger><TabsTrigger value="medications" className="justify-start rounded-2xl border border-[#3b271b]/10 bg-white/70 px-4 py-3 text-left text-sm data-[state=active]:bg-[#3b271b] data-[state=active]:text-[#f8f3ec]"><Pill className="mr-2 h-4 w-4" /> Medicines</TabsTrigger><TabsTrigger value="allergies" className="justify-start rounded-2xl border border-[#3b271b]/10 bg-white/70 px-4 py-3 text-left text-sm data-[state=active]:bg-[#3b271b] data-[state=active]:text-[#f8f3ec]"><AlertCircle className="mr-2 h-4 w-4" /> Allergies</TabsTrigger></TabsList><div className="mt-6 hidden rounded-[24px] border border-[#3b271b]/10 bg-[#e7d6bd]/45 p-5 lg:block"><Activity className="h-5 w-5 text-[#8b5e3c]" /><p className="mt-4 font-display text-xl">Small details help.</p><p className="mt-2 text-sm leading-6 text-[#3b271b]/60">Your profile gives each scan, visit, and product conversation a better starting point.</p></div></div>

                <div className="min-w-0">
                  <TabsContent value="personal" className="mt-0 space-y-5">
                    <Card className="rounded-[28px] border-[#3b271b]/10 bg-white shadow-[0_14px_45px_rgba(59,39,27,0.06)]"><CardHeader className="border-b border-[#3b271b]/10 p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b5e3c]">The person behind the routine</p><CardTitle className="mt-2 font-display text-3xl">Personal details</CardTitle><CardDescription className="max-w-xl text-sm leading-6">Tell us what you would like your care team to know about you.</CardDescription></CardHeader><CardContent className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8"><FormField control={form.control} name="full_name" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Full name</FormLabel><FormControl><Input {...field} className={fieldClass} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="age" render={({ field }) => <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} className={fieldClass} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="sex" render={({ field }) => <FormItem><FormLabel>How should we address you?</FormLabel><FormControl><select {...field} className={selectClass}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Phone number</FormLabel><FormControl><Input type="tel" placeholder="+234 000 000 0000" {...field} className={fieldClass} /></FormControl><FormDescription>For appointment reminders, if you choose.</FormDescription><FormMessage /></FormItem>} /><FormField control={form.control} name="country" render={({ field }) => <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} className={fieldClass} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="skin_type" render={({ field }) => <FormItem><FormLabel>Skin type</FormLabel><FormControl><select {...field} className={selectClass}><option value="oily">Oily</option><option value="dry">Dry</option><option value="combination">Combination</option><option value="normal">Normal</option><option value="sensitive">Sensitive</option></select></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="fitzpatrick_scale" render={({ field }) => <FormItem><FormLabel>Skin tone reference</FormLabel><FormControl><select {...field} className={selectClass}>{["I", "II", "III", "IV", "V", "VI"].map((scale) => <option key={scale} value={scale}>Type {scale}</option>)}</select></FormControl><FormMessage /></FormItem>} /></CardContent></Card>
                  </TabsContent>

                  <TabsContent value="medical" className="mt-0 space-y-5"><Card className="rounded-[28px] border-[#3b271b]/10 bg-white shadow-[0_14px_45px_rgba(59,39,27,0.06)]"><CardHeader className="border-b border-[#3b271b]/10 p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b5e3c]">For safer care</p><CardTitle className="mt-2 font-display text-3xl">Medical notes</CardTitle><CardDescription className="max-w-xl text-sm leading-6">These notes help a specialist understand what to avoid and when to suggest professional support.</CardDescription></CardHeader><CardContent className="space-y-6 p-6 sm:p-8"><ListEditor label="Medical conditions" placeholder="Add a condition" value={medicalConditions} input={newCondition} onInput={setNewCondition} onAdd={() => addItem(newCondition, medicalConditions, setMedicalConditions, setNewCondition)} onRemove={(item) => removeItem(item, medicalConditions, setMedicalConditions)} icon={<Heart className="h-4 w-4" />} /><FormField control={form.control} name="is_pregnant" render={({ field }) => <FormItem className="flex flex-row items-center justify-between gap-4 rounded-[22px] border border-[#d7a66e]/40 bg-[#fff6e8] p-5"><div className="space-y-1"><FormLabel className="text-base">Pregnancy status</FormLabel><FormDescription>We use this only to support safer product and treatment choices.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} /></CardContent></Card></TabsContent>

                  <TabsContent value="medications" className="mt-0 space-y-5"><Card className="rounded-[28px] border-[#3b271b]/10 bg-white shadow-[0_14px_45px_rgba(59,39,27,0.06)]"><CardHeader className="border-b border-[#3b271b]/10 p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b5e3c]">What is in the picture</p><CardTitle className="mt-2 font-display text-3xl">Current medicines</CardTitle><CardDescription className="max-w-xl text-sm leading-6">Include prescriptions, supplements, and topical treatments so conversations start with the right context.</CardDescription></CardHeader><CardContent className="p-6 sm:p-8"><ListEditor label="Medicines and supplements" placeholder="Add a medicine or supplement" value={medications} input={newMedication} onInput={setNewMedication} onAdd={() => addItem(newMedication, medications, setMedications, setNewMedication)} onRemove={(item) => removeItem(item, medications, setMedications)} icon={<Pill className="h-4 w-4" />} /></CardContent></Card></TabsContent>

                  <TabsContent value="allergies" className="mt-0 space-y-5"><Card className="rounded-[28px] border-[#3b271b]/10 bg-white shadow-[0_14px_45px_rgba(59,39,27,0.06)]"><CardHeader className="border-b border-[#3b271b]/10 p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b5e3c]">A clear boundary</p><CardTitle className="mt-2 font-display text-3xl">Known allergies</CardTitle><CardDescription className="max-w-xl text-sm leading-6">List anything that may affect products, treatments, or appointment planning.</CardDescription></CardHeader><CardContent className="p-6 sm:p-8"><ListEditor label="Allergies and sensitivities" placeholder="Add an allergy" value={allergies} input={newAllergy} onInput={setNewAllergy} onAdd={() => addItem(newAllergy, allergies, setAllergies, setNewAllergy)} onRemove={(item) => removeItem(item, allergies, setAllergies)} icon={<AlertCircle className="h-4 w-4" />} destructive /></CardContent></Card></TabsContent>

                  <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-[#3b271b]/10 bg-[#e7d6bd]/35 p-5 sm:flex-row sm:items-center sm:p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#71856b]" /><div><p className="font-semibold">Your changes stay with your care record.</p><p className="mt-1 text-sm text-[#3b271b]/60">Save after updating any tab.</p></div></div><div className="flex gap-3"><Button type="button" variant="outline" className="h-11 rounded-full border-[#3b271b]/20 bg-transparent" onClick={() => navigate("/dashboard")}>Cancel</Button><Button type="submit" disabled={saving} className="h-11 rounded-full bg-[#3b271b] px-6 text-[#f8f3ec] hover:bg-[#513622]">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : "Save changes"}</Button></div></div>
                </div>
              </Tabs>
            </form>
          </Form>
        </section>
      </main>
      {!embedded && <Footer />}
    </div>
  );
}

function SnapshotCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="rounded-[24px] border-[#3b271b]/10 bg-white/75 shadow-[0_10px_35px_rgba(59,39,27,0.05)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e7d6bd] text-[#8b5e3c]">{icon}</span><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3b271b]/40">On file</span></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8b5e3c]">{label}</p><p className="mt-2 font-display text-2xl capitalize">{value}</p><p className="mt-1 text-sm text-[#3b271b]/55">{detail}</p></CardContent></Card>;
}

function ListEditor({ label, placeholder, value, input, onInput, onAdd, onRemove, icon, destructive = false }: { label: string; placeholder: string; value: string[]; input: string; onInput: (value: string) => void; onAdd: () => void; onRemove: (item: string) => void; icon: React.ReactNode; destructive?: boolean }) {
  return <div><div className="flex items-center gap-2"><span className="text-[#8b5e3c]">{icon}</span><p className="font-semibold">{label}</p></div><div className="mt-3 flex gap-2"><Input value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(); } }} placeholder={placeholder} className={fieldClass} /><Button type="button" onClick={onAdd} className="h-12 w-12 shrink-0 rounded-2xl bg-[#3b271b] p-0 text-[#f8f3ec] hover:bg-[#513622]" aria-label={`Add ${label}`}><Plus className="h-4 w-4" /></Button></div>{value.length === 0 ? <p className="mt-3 text-sm text-[#3b271b]/45">Nothing added yet.</p> : <div className="mt-4 flex flex-wrap gap-2">{value.map((item) => <Badge key={item} variant={destructive ? "destructive" : "secondary"} className="gap-2 rounded-full px-3 py-2 text-xs">{item}<button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item}`}><X className="h-3 w-3" /></button></Badge>)}</div>}</div>;
}
