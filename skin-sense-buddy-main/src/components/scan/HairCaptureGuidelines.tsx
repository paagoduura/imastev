import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function HairCaptureGuidelines() {
  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Hair Capture Guidelines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <span>Use bright, natural lighting to show true hair color and texture</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <span>Capture on freshly washed, product-free hair for best results</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <span>Include clear scalp parting shots for scalp analysis</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <span>Take close-up strand shots to assess texture and damage</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>For Nigerian Hair:</strong> If transitioning from relaxed to natural, 
            try to capture the line of demarcation clearly. For locs or braids, 
            capture the scalp between partings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const HAIR_REQUIRED_ANGLES = ['crown', 'scalp_parting'];
export const HAIR_OPTIONAL_ANGLES = ['frontal', 'strand_closeup', 'nape'];

export const HAIR_ANGLE_DESCRIPTIONS: Record<string, string> = {
  crown: 'Top-down view of the crown area',
  scalp_parting: 'Clear view of scalp between hair partings',
  frontal: 'Front hairline and edges view',
  strand_closeup: 'Macro shot of individual strands',
  nape: 'Back of head/nape area',
};