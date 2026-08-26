import { AlertTriangle, CheckCircle2, Gauge, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ScanQuality } from "@/lib/scanEngine";

type ImageQualityMetrics = {
  blurScore: number;
  lightingScore: number;
  contrastScore: number;
  exposureScore: number;
  isAcceptable: boolean;
  issues: string[];
  recommendations: string[];
  scanQuality?: ScanQuality;
};

type Props = { quality: ImageQualityMetrics };

export const ImageQualityIndicator = ({ quality }: Props) => {
  const overall = quality.scanQuality;
  const score = overall?.score ?? Math.round((quality.blurScore + quality.lightingScore + quality.contrastScore) / 3);
  const threshold = overall?.threshold ?? 60;
  const ready = overall?.isAcceptable ?? quality.isAcceptable;
  const getScoreColor = (value: number) => value >= 70 ? "text-emerald-700" : value >= 50 ? "text-amber-700" : "text-rose-700";
  const getScoreIcon = (value: number) => value >= 70
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : value >= 50 ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-rose-600" />;
  const metrics = [
    ["Sharpness", quality.blurScore],
    ["Lighting", quality.lightingScore],
    ["Exposure", quality.exposureScore],
    ["Contrast", quality.contrastScore],
  ] as const;

  return (
    <Card className={ready ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}>
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={ready ? "rounded-xl bg-emerald-100 p-2.5" : "rounded-xl bg-amber-100 p-2.5"}>
              <Gauge className={ready ? "h-5 w-5 text-emerald-700" : "h-5 w-5 text-amber-700"} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Capture quality</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">A quality gate protects the reliability of your scan.</p>
            </div>
          </div>
          <Badge variant={ready ? "default" : "destructive"}>{ready ? "Ready to analyse" : "Retake required"}</Badge>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/75 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Scan quality</p>
              <p className={`mt-1 text-3xl font-display font-bold ${getScoreColor(score)}`}>{score}<span className="text-base font-medium text-muted-foreground">/100</span></p>
            </div>
            <p className="text-right text-xs text-muted-foreground">Minimum<br /><strong className="text-slate-700">{threshold}/100</strong></p>
          </div>
          <Progress value={score} className="mt-3 h-2" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map(([label, value]) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-700">{getScoreIcon(value)} {label}</span>
                <span className={`font-semibold ${getScoreColor(value)}`}>{Math.round(value)}%</span>
              </div>
              <Progress value={value} className="h-1.5" />
            </div>
          ))}
        </div>
        {quality.issues.length > 0 && (
          <div className="space-y-2 border-t border-amber-200/70 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">What needs attention</p>
            {quality.issues.slice(0, 3).map((issue) => <p key={issue} className="flex items-start gap-2 text-xs leading-5 text-amber-900"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue}</p>)}
          </div>
        )}
        {quality.recommendations.length > 0 && (
          <div className="space-y-2 border-t border-primary/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">For your next capture</p>
            {quality.recommendations.slice(0, 3).map((recommendation) => <p key={recommendation} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{recommendation}</p>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
