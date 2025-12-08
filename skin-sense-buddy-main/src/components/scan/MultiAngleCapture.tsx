import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Check, X, RotateCw } from "lucide-react";

interface CapturedAngle {
  angle: string;
  dataUrl: string;
  quality: {
    blurScore: number;
    lightingScore: number;
    isAcceptable: boolean;
  };
}

interface Props {
  requiredAngles: string[];
  captures: CapturedAngle[];
  onRemove: (angle: string) => void;
  onRetake: (angle: string) => void;
}

const ANGLE_DESCRIPTIONS: Record<string, string> = {
  'front': 'Face the camera directly',
  'left': 'Turn your head 45° to the left',
  'right': 'Turn your head 45° to the right',
  'close': 'Close-up of the affected area',
  'overhead': 'Top-down view with good lighting'
};

export const MultiAngleCapture = ({ requiredAngles, captures, onRemove, onRetake }: Props) => {
  const getAngleStatus = (angle: string) => {
    const capture = captures.find(c => c.angle === angle);
    if (!capture) return 'pending';
    if (!capture.quality.isAcceptable) return 'warning';
    return 'complete';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Multi-Angle Capture</h3>
          <p className="text-sm text-muted-foreground">
            {captures.length} of {requiredAngles.length} required angles captured
          </p>
        </div>
        <Badge variant={captures.length === requiredAngles.length ? "default" : "secondary"}>
          {captures.length}/{requiredAngles.length}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {requiredAngles.map((angle) => {
          const capture = captures.find(c => c.angle === angle);
          const status = getAngleStatus(angle);

          return (
            <Card 
              key={angle}
              className={`border-2 ${
                status === 'complete' ? 'border-success' :
                status === 'warning' ? 'border-warning' :
                'border-border'
              }`}
            >
              <CardContent className="p-3 space-y-2">
                {/* Angle preview */}
                <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                  {capture ? (
                    <>
                      <img
                        src={capture.dataUrl}
                        alt={`${angle} view`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {status === 'complete' && (
                          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {status === 'warning' && (
                          <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Angle info */}
                <div>
                  <p className="font-medium text-sm capitalize">{angle} View</p>
                  <p className="text-xs text-muted-foreground">
                    {ANGLE_DESCRIPTIONS[angle] || 'Capture this angle'}
                  </p>
                </div>

                {/* Quality indicator */}
                {capture && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between">
                        <span>Quality:</span>
                        <span className={
                          capture.quality.isAcceptable ? 'text-success' : 'text-warning'
                        }>
                          {capture.quality.isAcceptable ? 'Good' : 'Fair'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {capture && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onRetake(angle)}
                    >
                      <RotateCw className="w-3 h-3 mr-1" />
                      Retake
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(angle)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
