import { ArrowRight, CheckCircle2, Droplets, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisTypeSelectorProps {
  value: "skin" | "hair";
  onChange: (value: "skin" | "hair") => void;
}

const pathways = {
  hair: {
    eyebrow: "Hair + scalp",
    title: "Find your hair starting point.",
    body: "Explore texture, porosity, density, scalp comfort, and the care your routine can actually sustain.",
    tags: ["Texture", "Porosity", "Scalp care"],
    Icon: Scissors,
    color: "hair",
  },
  skin: {
    eyebrow: "Skin",
    title: "See your skin more clearly.",
    body: "Start with a calmer understanding of visible concerns, sensitivity, and the next gentle step.",
    tags: ["Texture", "Sensitivity", "Routine"],
    Icon: Droplets,
    color: "skin",
  },
} as const;

export function AnalysisTypeSelector({ value, onChange }: AnalysisTypeSelectorProps) {
  return (
    <div className="scan-selector space-y-6">
      <div className="scan-selector-heading space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Begin with understanding</p>
        <h2 className="text-2xl font-display font-semibold text-slate-900 sm:text-4xl">
          What would you like to understand first?
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          Choose a starting point. We will guide you through a private capture and return a clear next step for your care.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {(Object.keys(pathways) as Array<keyof typeof pathways>).map((key) => {
          const pathway = pathways[key];
          const selected = value === key;
          const Icon = pathway.Icon;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(key)}
              className={cn(
                "scan-selector-card group relative min-h-[19rem] overflow-hidden rounded-[1.35rem] border-2 p-6 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-7",
                selected
                  ? "scan-selector-card-selected"
                  : "border-[#d8cbbd] bg-white hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_40px_rgba(72,43,22,.1)]",
                pathway.color === "hair" ? "scan-selector-hair" : "scan-selector-skin",
              )}
            >
              <span className="absolute -right-3 -top-5 font-serif text-[8rem] leading-none text-[#24160d]/[.06]">0{key === "hair" ? 1 : 2}</span>
              <div className="relative flex items-start justify-between gap-4">
                <span className="scan-selector-icon"><Icon size={20} strokeWidth={1.7} /></span>
                {selected && <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Selected" />}
              </div>
              <div className="relative mt-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{pathway.eyebrow}</p>
                <h3 className="mt-2 max-w-[12ch] font-serif text-3xl leading-[.95] tracking-[-.04em] text-[#24160d]">{pathway.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#6e5b4c]">{pathway.body}</p>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center gap-2">
                {pathway.tags.map((tag) => <span key={tag} className="scan-selector-tag">{tag}</span>)}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-primary">Choose <ArrowRight size={14} /></span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs leading-5 text-slate-500">
        Your images stay within your private care record. The scan provides guidance, not a medical diagnosis.
      </p>
    </div>
  );
}
