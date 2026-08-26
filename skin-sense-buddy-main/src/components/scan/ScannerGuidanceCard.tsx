import { AlertCircle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScanAngle, ScanMode } from "@/lib/scanEngine";
import { SCAN_MODE_CONFIG } from "@/lib/scanEngine";

type ScannerGuidanceCardProps = {
  mode: ScanMode;
  angle: ScanAngle;
  capturedCount: number;
  requiredCount: number;
};

export function ScannerGuidanceCard({ mode, angle, capturedCount, requiredCount }: ScannerGuidanceCardProps) {
  const config = SCAN_MODE_CONFIG[mode];
  const isScalp = mode === "scalp" || mode === "full" && angle.id === "crown";

  return (
    <Card className="overflow-hidden border-primary/15 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
      <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">{config.shortLabel}</Badge>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                View {capturedCount + 1} of {requiredCount}
              </span>
            </div>
            <CardTitle className="text-xl text-slate-900">{angle.label} view</CardTitle>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{angle.description}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Private by design
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {angle.instructions.map((instruction) => (
            <div key={instruction} className="flex items-start gap-2 rounded-xl border border-primary/10 bg-[#fbfaf7] p-3 text-sm leading-5 text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{instruction}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">What this scan can assess</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/75">{config.purpose}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Keep the result honest</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isScalp
                  ? "A photograph can show visible patterns, not diagnose alopecia, infection, psoriasis, dermatitis, or another medical disorder."
                  : "Anything that is not visible clearly will be marked as unable to determine reliably rather than guessed."
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
