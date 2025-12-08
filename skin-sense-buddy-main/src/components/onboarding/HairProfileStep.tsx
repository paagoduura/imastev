import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Droplets, FlaskConical, Calendar, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface HairProfileStepProps {
  form: UseFormReturn<any>;
  subStep: 'type' | 'porosity' | 'chemical';
}

const HAIR_TYPES = [
  {
    value: "3c",
    label: "Type 3C",
    description: "Tight curls, corkscrew pattern",
    pattern: "Defined S-shaped curls that are tightly coiled",
    visual: "🌀",
  },
  {
    value: "4a",
    label: "Type 4A",
    description: "S-shaped coils",
    pattern: "Defined S-pattern coils with visible curl definition",
    visual: "➰",
  },
  {
    value: "4b",
    label: "Type 4B",
    description: "Z-shaped pattern",
    pattern: "Sharp Z-pattern angles, less defined curls",
    visual: "⚡",
  },
  {
    value: "4c",
    label: "Type 4C",
    description: "Tight coils, minimal definition",
    pattern: "Densely packed coils with little to no curl definition",
    visual: "💫",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Chemically straightened",
    pattern: "Permanently straightened with relaxer treatment",
    visual: "〰️",
  },
  {
    value: "transitioning",
    label: "Transitioning",
    description: "Growing out relaxer",
    pattern: "Two textures: natural roots with relaxed ends",
    visual: "🔄",
  },
  {
    value: "locs",
    label: "Locs/Dreadlocks",
    description: "Mature or starter locs",
    pattern: "Hair locked into rope-like strands",
    visual: "🔗",
  },
];

const POROSITY_LEVELS = [
  {
    value: "low",
    label: "Low Porosity",
    description: "Hair takes long to get wet and dry",
    indicators: [
      "Water beads on hair surface",
      "Products sit on hair",
      "Hair takes forever to air dry",
      "Resistant to chemical treatments",
    ],
    color: "from-blue-500 to-cyan-500",
    icon: "💧",
  },
  {
    value: "normal",
    label: "Normal Porosity",
    description: "Hair absorbs and retains moisture well",
    indicators: [
      "Holds styles well",
      "Accepts color evenly",
      "Hair is naturally shiny",
      "Minimal frizz issues",
    ],
    color: "from-green-500 to-emerald-500",
    icon: "✨",
  },
  {
    value: "high",
    label: "High Porosity",
    description: "Hair absorbs water quickly but loses moisture fast",
    indicators: [
      "Hair dries very quickly",
      "Prone to frizz and tangles",
      "Easily damaged by chemicals",
      "Hair feels rough or dry",
    ],
    color: "from-orange-500 to-amber-500",
    icon: "🌊",
  },
];

const HAIR_DENSITIES = [
  { value: "fine", label: "Fine/Thin", description: "Individual strands are thin, hair lies flat" },
  { value: "medium", label: "Medium", description: "Average strand thickness, good volume" },
  { value: "thick", label: "Thick/Coarse", description: "Individual strands are thick, lots of volume" },
];

const HAIR_LENGTHS = [
  { value: "twa", label: "TWA (Teeny Weeny Afro)", description: "Less than 2 inches" },
  { value: "short", label: "Short", description: "2-6 inches" },
  { value: "medium", label: "Medium", description: "6-12 inches (shoulder length)" },
  { value: "long", label: "Long", description: "12-18 inches (armpit to bra strap)" },
  { value: "waist-length", label: "Waist Length+", description: "18+ inches" },
];

const CHEMICAL_TREATMENTS = [
  { value: "relaxer", label: "Relaxer", description: "Chemical straightening" },
  { value: "texturizer", label: "Texturizer", description: "Mild relaxer for loose curls" },
  { value: "keratin", label: "Keratin Treatment", description: "Semi-permanent straightening" },
  { value: "color", label: "Hair Color/Dye", description: "Permanent or semi-permanent color" },
  { value: "bleach", label: "Bleach/Highlights", description: "Lightening treatments" },
  { value: "henna", label: "Henna", description: "Natural hair coloring" },
];

const SCALP_CONDITIONS = [
  { value: "normal", label: "Normal", description: "Balanced, healthy scalp" },
  { value: "dry", label: "Dry/Flaky", description: "Dryness, itchiness, visible flakes" },
  { value: "oily", label: "Oily", description: "Excess sebum production" },
  { value: "sensitive", label: "Sensitive", description: "Easily irritated" },
  { value: "dandruff", label: "Dandruff", description: "Seborrheic dermatitis" },
];

const HAIR_CONCERNS = [
  { value: "breakage", label: "Breakage", icon: "💔" },
  { value: "thinning", label: "Thinning/Hair Loss", icon: "📉" },
  { value: "dryness", label: "Dryness", icon: "🏜️" },
  { value: "product_buildup", label: "Product Buildup", icon: "🧴" },
  { value: "heat_damage", label: "Heat Damage", icon: "🔥" },
  { value: "split_ends", label: "Split Ends", icon: "✂️" },
  { value: "shedding", label: "Excessive Shedding", icon: "🍂" },
  { value: "frizz", label: "Frizz", icon: "🌫️" },
  { value: "tangles", label: "Tangles/Knots", icon: "🪢" },
  { value: "slow_growth", label: "Slow Growth", icon: "🐢" },
];

export function HairProfileStep({ form, subStep }: HairProfileStepProps) {
  const isChemicallyTreated = form.watch("is_chemically_treated");

  if (subStep === 'type') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold">Let's understand your hair</h3>
          <p className="text-sm text-muted-foreground">
            Select your hair texture for personalized care recommendations
          </p>
        </div>

        {/* Hair Type Selection */}
        <FormField
          control={form.control}
          name="hair_type"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="text-base font-semibold flex items-center gap-2">
                Hair Texture Type *
                <Badge variant="secondary" className="text-xs">Nigerian Hair Focus</Badge>
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid md:grid-cols-2 gap-3"
                >
                  {HAIR_TYPES.map((type) => (
                    <FormItem key={type.value}>
                      <FormControl>
                        <div
                          className={cn(
                            "relative flex cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md",
                            field.value === type.value
                              ? "border-amber-500 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 shadow-md"
                              : "border-border hover:border-amber-500/50"
                          )}
                          onClick={() => field.onChange(type.value)}
                        >
                          <RadioGroupItem
                            value={type.value}
                            id={`hair-${type.value}`}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-3 w-full">
                            <div className="text-2xl">{type.visual}</div>
                            <div className="flex-1">
                              <FormLabel
                                htmlFor={`hair-${type.value}`}
                                className="font-semibold cursor-pointer"
                              >
                                {type.label}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {type.description}
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                {type.pattern}
                              </p>
                            </div>
                            {field.value === type.value && (
                              <CheckCircle2 className="w-5 h-5 text-amber-500 absolute top-3 right-3" />
                            )}
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

        {/* Hair Density & Length */}
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hair_density"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hair Density</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select density" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HAIR_DENSITIES.map((density) => (
                      <SelectItem key={density.value} value={density.value}>
                        <div>
                          <span className="font-medium">{density.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            - {density.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hair_length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Hair Length</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HAIR_LENGTHS.map((length) => (
                      <SelectItem key={length.value} value={length.value}>
                        <div>
                          <span className="font-medium">{length.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    );
  }

  if (subStep === 'porosity') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold">Porosity & Scalp Health</h3>
          <p className="text-sm text-muted-foreground">
            Understanding your hair's moisture behavior helps us recommend the right products
          </p>
        </div>

        {/* Porosity Selection */}
        <FormField
          control={form.control}
          name="hair_porosity"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <FormLabel className="text-base font-semibold flex items-center gap-2">
                Hair Porosity Level
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  title="Porosity determines how well your hair absorbs and retains moisture"
                >
                  <Info className="w-4 h-4" />
                </button>
              </FormLabel>
              <FormDescription>
                Not sure? Try the float test: drop a clean strand in water. Floats = low, sinks slowly = normal, sinks fast = high
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid gap-4"
                >
                  {POROSITY_LEVELS.map((level) => (
                    <FormItem key={level.value}>
                      <FormControl>
                        <div
                          className={cn(
                            "relative flex cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md overflow-hidden",
                            field.value === level.value
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => field.onChange(level.value)}
                        >
                          <RadioGroupItem
                            value={level.value}
                            id={`porosity-${level.value}`}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-4 w-full">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
                              level.color
                            )}>
                              {level.icon}
                            </div>
                            <div className="flex-1">
                              <FormLabel
                                htmlFor={`porosity-${level.value}`}
                                className="font-semibold cursor-pointer text-base"
                              >
                                {level.label}
                              </FormLabel>
                              <p className="text-sm text-muted-foreground mt-1">
                                {level.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {level.indicators.map((indicator, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {indicator}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {field.value === level.value && (
                              <CheckCircle2 className="w-5 h-5 text-primary absolute top-3 right-3" />
                            )}
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

        {/* Scalp Condition */}
        <FormField
          control={form.control}
          name="scalp_condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Scalp Condition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-auto py-3">
                    <SelectValue placeholder="Select your scalp condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SCALP_CONDITIONS.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      <div className="py-1">
                        <span className="font-medium">{condition.label}</span>
                        <span className="text-xs text-muted-foreground block">
                          {condition.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hair Concerns */}
        <FormField
          control={form.control}
          name="hair_concerns"
          render={() => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Hair Concerns</FormLabel>
              <FormDescription>Select all that apply to your hair</FormDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {HAIR_CONCERNS.map((concern) => (
                  <FormField
                    key={concern.value}
                    control={form.control}
                    name="hair_concerns"
                    render={({ field }) => {
                      const currentValue = field.value || [];
                      return (
                        <FormItem>
                          <FormControl>
                            <div
                              className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                                currentValue.includes(concern.value)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                              onClick={() => {
                                const newValue = currentValue.includes(concern.value)
                                  ? currentValue.filter((v: string) => v !== concern.value)
                                  : [...currentValue, concern.value];
                                field.onChange(newValue);
                              }}
                            >
                              <Checkbox
                                checked={currentValue.includes(concern.value)}
                                className="pointer-events-none"
                              />
                              <span>{concern.icon}</span>
                              <span className="text-xs">{concern.label}</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  if (subStep === 'chemical') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold">Chemical Treatment History</h3>
          <p className="text-sm text-muted-foreground">
            This helps us understand your hair's current state and recommend safe treatments
          </p>
        </div>

        {/* Is Chemically Treated */}
        <FormField
          control={form.control}
          name="is_chemically_treated"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <div className="space-y-2">
                <FormLabel className="text-base font-semibold">Is your hair chemically treated?</FormLabel>
                <FormDescription>
                  This includes relaxers, texturizers, permanent color, or keratin treatments
                </FormDescription>
              </div>
              <FormControl>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all",
                      !field.value
                        ? "border-purple-500 bg-purple-500/10 text-purple-700"
                        : "border-border hover:border-purple-500/50"
                    )}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all",
                      field.value
                        ? "border-purple-500 bg-purple-500/10 text-purple-700"
                        : "border-border hover:border-purple-500/50"
                    )}
                  >
                    Yes
                  </button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Chemical Treatments Selection */}
        {isChemicallyTreated && (
          <div className="space-y-4 animate-fade-in">
            <FormField
              control={form.control}
              name="chemical_treatments"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Which treatments have you had?</FormLabel>
                  <FormDescription>Select all that apply</FormDescription>
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    {CHEMICAL_TREATMENTS.map((treatment) => (
                      <FormField
                        key={treatment.value}
                        control={form.control}
                        name="chemical_treatments"
                        render={({ field }) => {
                          const currentValue = field.value || [];
                          return (
                            <FormItem>
                              <FormControl>
                                <div
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                    currentValue.includes(treatment.value)
                                      ? "border-purple-500 bg-purple-500/10"
                                      : "border-border hover:border-purple-500/50"
                                  )}
                                  onClick={() => {
                                    const newValue = currentValue.includes(treatment.value)
                                      ? currentValue.filter((v: string) => v !== treatment.value)
                                      : [...currentValue, treatment.value];
                                    field.onChange(newValue);
                                  }}
                                >
                                  <Checkbox
                                    checked={currentValue.includes(treatment.value)}
                                    className="pointer-events-none"
                                  />
                                  <div>
                                    <span className="font-medium">{treatment.label}</span>
                                    <p className="text-xs text-muted-foreground">{treatment.description}</p>
                                  </div>
                                </div>
                              </FormControl>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Treatment Date */}
            <FormField
              control={form.control}
              name="last_chemical_treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Last Chemical Treatment
                  </FormLabel>
                  <FormControl>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    When was your most recent chemical treatment?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for recent treatments */}
            {form.watch("chemical_treatments")?.includes("relaxer") && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/50 bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-warning">Relaxed Hair Care Note</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Relaxed hair requires extra moisture and protein balance. Our analysis will focus on 
                    demarcation line health (if transitioning) and minimizing breakage.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion message */}
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">Hair Profile Complete!</p>
              <p className="text-sm text-muted-foreground">
                Your hair profile will help us provide personalized hair analysis, product recommendations, 
                and treatment plans tailored specifically for Nigerian hair care needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
