import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type ScanEvidenceSummaryProps = {
  qualityScore?: number;
  qualityThreshold?: number;
  capturedCount?: number;
  requiredCount?: number;
  evidenceQuality?: string;
  analysisStatus?: string;
  safetyFlags?: string[];
};

const labelFor = (value: string | undefined) => {
  if (!value) return "Not reported";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function ScanEvidenceSummary({
  qualityScore,
  qualityThreshold = 60,
  capturedCount,
  requiredCount,
  evidenceQuality,
  analysisStatus,
  safetyFlags = [],
}: ScanEvidenceSummaryProps) {
  const qualityReady = qualityScore === undefined || qualityScore >= qualityThreshold;
  const hasLimitedEvidence = evidenceQuality === "limited" || analysisStatus === "unable_to_determine";
  return (
    <Card className="border-primary/10 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence summary</p>
            <h2 className="mt-1 text-xl font-display font-semibold text-slate-900">How to read this scan</h2>
          </div>
          <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Private record</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-[#fbfaf7] p-4">
            <p className="text-xs text-muted-foreground">Scan quality</p>
            <p className="mt-1 text-2xl font-display font-bold text-slate-900">{qualityScore === undefined ? "—" : `${Math.round(qualityScore)}/100`}</p>
            <p className="mt-1 text-xs text-muted-foreground">{qualityReady ? "Suitable for review" : "Retake recommended"}</p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-[#fbfaf7] p-4">
            <p className="text-xs text-muted-foreground">Evidence quality</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{labelFor(evidenceQuality)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on visible cues</p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-[#fbfaf7] p-4">
            <p className="text-xs text-muted-foreground">Capture coverage</p>
            <p className="mt-1 text-2xl font-display font-bold text-slate-900">{capturedCount === undefined || requiredCount === undefined ? "—" : `${capturedCount}/${requiredCount}`}</p>
            <p className="mt-1 text-xs text-muted-foreground">Guided views considered</p>
          </div>
        </div>
        {qualityScore !== undefined && <Progress value={qualityScore} className="h-2" />}
        <div className={hasLimitedEvidence || safetyFlags.length > 0 ? "rounded-2xl border border-amber-200 bg-amber-50/70 p-4" : "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"}>
          <div className="flex items-start gap-3">
            {hasLimitedEvidence || safetyFlags.length > 0 ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}
            <div>
              <p className="text-sm font-semibold text-slate-900">{hasLimitedEvidence ? "Some findings need qualification" : "Findings are presented with context"}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {hasLimitedEvidence
                  ? "The available images do not support a confident named finding. Treat this as a visual observation and consider another capture or professional review."
                  : "This is a visual assessment, not a medical diagnosis. Confidence reflects the available image evidence and should not be read as a guarantee of accuracy."}
              </p>
              {safetyFlags.length > 0 && <p className="mt-2 text-xs font-medium text-amber-800">Review flags: {safetyFlags.map(labelFor).join(", ")}</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
