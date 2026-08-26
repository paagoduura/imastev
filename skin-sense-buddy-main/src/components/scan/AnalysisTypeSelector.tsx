import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleUserRound, Layers3, Scissors, ScanFace } from "lucide-react";
import type { ScanMode } from "@/lib/scanEngine";
import { SCAN_MODE_CONFIG } from "@/lib/scanEngine";

type AnalysisTypeSelectorProps = {
  value: ScanMode;
  onChange: (value: ScanMode) => void;
};

const modeCards: Array<{ mode: ScanMode; icon: typeof ScanFace; tone: string; activeTone: string; tags: string[] }> = [
  { mode: "skin", icon: ScanFace, tone: "rose", activeTone: "ring-rose-500 shadow-rose-500/15 bg-rose-50/80", tags: ["Texture", "Tone", "Hydration"] },
  { mode: "hair", icon: Scissors, tone: "amber", activeTone: "ring-amber-500 shadow-amber-500/15 bg-amber-50/80", tags: ["Pattern", "Density", "Damage"] },
  { mode: "scalp", icon: CircleUserRound, tone: "teal", activeTone: "ring-teal-600 shadow-teal-500/15 bg-teal-50/80", tags: ["Hairline", "Scaling", "Buildup"] },
  { mode: "full", icon: Layers3, tone: "violet", activeTone: "ring-violet-600 shadow-violet-500/15 bg-violet-50/80", tags: ["Skin", "Hair", "Scalp"] },
];

const toneClasses: Record<string, { icon: string; iconInactive: string; tag: string }> = {
  rose: { icon: "bg-rose-500 text-white shadow-rose-500/25", iconInactive: "bg-rose-100 text-rose-600", tag: "bg-rose-500/10 text-rose-700 border-rose-500/15" },
  amber: { icon: "bg-amber-500 text-white shadow-amber-500/25", iconInactive: "bg-amber-100 text-amber-700", tag: "bg-amber-500/10 text-amber-800 border-amber-500/15" },
  teal: { icon: "bg-teal-700 text-white shadow-teal-500/25", iconInactive: "bg-teal-100 text-teal-700", tag: "bg-teal-500/10 text-teal-800 border-teal-500/15" },
  violet: { icon: "bg-violet-700 text-white shadow-violet-500/25", iconInactive: "bg-violet-100 text-violet-700", tag: "bg-violet-500/10 text-violet-800 border-violet-500/15" },
};

export function AnalysisTypeSelector({ value, onChange }: AnalysisTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Choose your care view</p>
        <h2 className="text-3xl font-display font-bold leading-tight text-slate-900 sm:text-4xl">Start with the area you want to understand.</h2>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Each view uses guided captures and a quality check before analysis. You can choose one area or combine them into one private care record.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {modeCards.map(({ mode, icon: Icon, tone, activeTone, tags }) => {
          const selected = value === mode;
          const toneSet = toneClasses[tone];
          const config = SCAN_MODE_CONFIG[mode];
          return (
            <Card
              key={mode}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/85 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected && `ring-2 ${activeTone}`,
              )}
              onClick={() => onChange(mode)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(mode);
                }
              }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-amber-400/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              {selected && <CheckCircle2 className="absolute right-5 top-5 h-5 w-5 text-primary" />}
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 group-hover:scale-[1.03]", selected ? toneSet.icon : toneSet.iconInactive)}>
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-semibold text-slate-900">{config.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => <span key={tag} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", toneSet.tag)}>{tag}</span>)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
