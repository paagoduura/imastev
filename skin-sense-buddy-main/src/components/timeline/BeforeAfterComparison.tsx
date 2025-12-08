import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface BeforeAfterComparisonProps {
  beforeScan: {
    id: string;
    image_url: string;
    created_at: string;
    diagnoses: Array<{
      primary_condition: string;
      confidence_score: number;
      severity?: string;
    }>;
  };
  afterScan: {
    id: string;
    image_url: string;
    created_at: string;
    diagnoses: Array<{
      primary_condition: string;
      confidence_score: number;
      severity?: string;
    }>;
  };
}

export function BeforeAfterComparison({ beforeScan, afterScan }: BeforeAfterComparisonProps) {
  const [sliderValue, setSliderValue] = useState([50]);

  const beforeDiagnosis = beforeScan.diagnoses[0];
  const afterDiagnosis = afterScan.diagnoses[0];

  const improvementPercentage = beforeDiagnosis && afterDiagnosis
    ? Math.round(((beforeDiagnosis.confidence_score - afterDiagnosis.confidence_score) / beforeDiagnosis.confidence_score) * 100)
    : 0;

  const severityImprovement = beforeDiagnosis?.severity && afterDiagnosis?.severity
    ? calculateSeverityImprovement(beforeDiagnosis.severity, afterDiagnosis.severity)
    : null;

  const daysBetween = Math.round(
    (new Date(afterScan.created_at).getTime() - new Date(beforeScan.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Before & After Comparison</CardTitle>
            <CardDescription>
              {format(new Date(beforeScan.created_at), "MMM d, yyyy")} vs{" "}
              {format(new Date(afterScan.created_at), "MMM d, yyyy")} ({daysBetween} days)
            </CardDescription>
          </div>
          {improvementPercentage !== 0 && (
            <Badge
              variant={improvementPercentage > 0 ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {improvementPercentage > 0 ? (
                <TrendingDown className="w-4 h-4 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-1" />
              )}
              {Math.abs(improvementPercentage)}% {improvementPercentage > 0 ? "Improvement" : "Change"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Comparison Slider */}
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
          <div className="absolute inset-0">
            <img
              src={beforeScan.image_url}
              alt="Before"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}
          >
            <img
              src={afterScan.image_url}
              alt="After"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
            style={{ left: `${sliderValue[0]}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            Before
          </div>
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            After
          </div>
        </div>

        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          max={100}
          step={1}
          className="w-full"
        />

        {/* Condition Analysis */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Before</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Condition</p>
                <p className="font-semibold">{beforeDiagnosis?.primary_condition || "N/A"}</p>
              </div>
              {beforeDiagnosis?.severity && (
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge variant="outline" className="capitalize">
                    {beforeDiagnosis.severity}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="font-semibold">{beforeDiagnosis?.confidence_score.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">After</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Condition</p>
                <p className="font-semibold">{afterDiagnosis?.primary_condition || "N/A"}</p>
              </div>
              {afterDiagnosis?.severity && (
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge variant="outline" className="capitalize">
                    {afterDiagnosis.severity}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="font-semibold">{afterDiagnosis?.confidence_score.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Severity Improvement */}
        {severityImprovement && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              {severityImprovement.improved ? (
                <TrendingDown className="w-5 h-5 text-primary" />
              ) : (
                <TrendingUp className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">{severityImprovement.message}</p>
                <p className="text-sm text-muted-foreground">
                  Severity changed from {beforeDiagnosis.severity} to {afterDiagnosis.severity}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateSeverityImprovement(before: string, after: string): { improved: boolean; message: string } | null {
  const severityLevels: Record<string, number> = {
    mild: 1,
    moderate: 2,
    severe: 3,
  };

  const beforeLevel = severityLevels[before.toLowerCase()] || 0;
  const afterLevel = severityLevels[after.toLowerCase()] || 0;

  if (beforeLevel === 0 || afterLevel === 0) return null;

  if (beforeLevel > afterLevel) {
    return {
      improved: true,
      message: "Condition severity has improved",
    };
  } else if (beforeLevel < afterLevel) {
    return {
      improved: false,
      message: "Condition severity has worsened",
    };
  }

  return {
    improved: true,
    message: "Condition severity remains stable",
  };
}
