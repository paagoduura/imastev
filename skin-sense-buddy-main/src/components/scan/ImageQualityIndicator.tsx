import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ImageQualityMetrics {
  blurScore: number;
  lightingScore: number;
  contrastScore: number;
  exposureScore: number;
  isAcceptable: boolean;
  issues: string[];
  recommendations: string[];
}

interface Props {
  quality: ImageQualityMetrics;
}

export const ImageQualityIndicator = ({ quality }: Props) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (score >= 50) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  return (
    <Card className={`border-2 ${
      quality.isAcceptable 
        ? 'border-success bg-success/5' 
        : 'border-warning bg-warning/5'
    }`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Image Quality Assessment</h3>
          <Badge variant={quality.isAcceptable ? "default" : "destructive"}>
            {quality.isAcceptable ? "Acceptable" : "Needs Improvement"}
          </Badge>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getScoreIcon(quality.blurScore)}
                Sharpness
              </span>
              <span className={`font-medium ${getScoreColor(quality.blurScore)}`}>
                {Math.round(quality.blurScore)}%
              </span>
            </div>
            <Progress value={quality.blurScore} className="h-1" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getScoreIcon(quality.lightingScore)}
                Lighting
              </span>
              <span className={`font-medium ${getScoreColor(quality.lightingScore)}`}>
                {Math.round(quality.lightingScore)}%
              </span>
            </div>
            <Progress value={quality.lightingScore} className="h-1" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getScoreIcon(quality.contrastScore)}
                Contrast
              </span>
              <span className={`font-medium ${getScoreColor(quality.contrastScore)}`}>
                {Math.round(quality.contrastScore)}%
              </span>
            </div>
            <Progress value={quality.contrastScore} className="h-1" />
          </div>
        </div>

        {/* Issues & Recommendations */}
        {quality.issues.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Issues Detected:</p>
            {quality.issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-destructive">
                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {quality.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Recommendations:</p>
            {quality.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
