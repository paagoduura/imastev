import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, CheckCircle2, AlertCircle } from "lucide-react";
import { detectCircles, REFERENCE_OBJECTS, calculatePixelsPerMM, drawCalibrationOverlay } from "@/lib/scaleCalibration";

interface Props {
  imageDataUrl: string;
  onCalibrationComplete: (pixelsPerMM: number, referenceType: string) => void;
}

export const ScaleCalibrationTool = ({ imageDataUrl, onCalibrationComplete }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedReference, setSelectedReference] = useState<string>('us_quarter');
  const [detectedCircles, setDetectedCircles] = useState<any[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<number>(-1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pixelsPerMM, setPixelsPerMM] = useState<number | null>(null);

  useEffect(() => {
    if (imageDataUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match image
        canvas.width = Math.min(img.width, 800);
        canvas.height = (img.height * canvas.width) / img.width;

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = imageDataUrl;
    }
  }, [imageDataUrl]);

  const handleDetectReference = async () => {
    if (!canvasRef.current) return;

    setIsDetecting(true);
    try {
      // Detect circles in the image
      const circles = detectCircles(canvasRef.current);
      setDetectedCircles(circles);

      if (circles.length > 0) {
        // Auto-select the most confident detection
        const bestCircle = circles.reduce((best, current, index) =>
          current.confidence > circles[best].confidence ? index : best
        , 0);
        setSelectedCircle(bestCircle);

        // Calculate scale
        const reference = REFERENCE_OBJECTS[selectedReference];
        const ppm = calculatePixelsPerMM(circles[bestCircle].radius, reference);
        setPixelsPerMM(ppm);
      }
    } catch (error) {
      console.error('Error detecting reference:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCircleSelect = (index: number) => {
    setSelectedCircle(index);
    const reference = REFERENCE_OBJECTS[selectedReference];
    const ppm = calculatePixelsPerMM(detectedCircles[index].radius, reference);
    setPixelsPerMM(ppm);
  };

  const handleConfirm = () => {
    if (pixelsPerMM && selectedCircle >= 0) {
      onCalibrationComplete(pixelsPerMM, selectedReference);
    }
  };

  // Draw overlay when circles are detected
  useEffect(() => {
    if (canvasRef.current && detectedCircles.length > 0) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Redraw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw detection overlay
        drawCalibrationOverlay(canvas, detectedCircles, selectedCircle);
      };
      img.src = imageDataUrl;
    }
  }, [detectedCircles, selectedCircle, imageDataUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="w-5 h-5" />
          Scale Calibration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Place a reference object (coin, ruler, or credit card) next to the affected area for accurate size measurements.
        </p>

        {/* Reference object selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Reference Object</label>
          <Select value={selectedReference} onValueChange={setSelectedReference}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us_quarter">US Quarter (24.26mm)</SelectItem>
              <SelectItem value="us_penny">US Penny (19.05mm)</SelectItem>
              <SelectItem value="euro_1">1 Euro Coin (23.25mm)</SelectItem>
              <SelectItem value="euro_2">2 Euro Coin (25.75mm)</SelectItem>
              <SelectItem value="gbp_1">£1 Coin (23.43mm)</SelectItem>
              <SelectItem value="credit_card">Credit Card (85.6mm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Canvas preview */}
        <div className="rounded-lg overflow-hidden border">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-96 object-contain bg-muted"
          />
        </div>

        {/* Detection info */}
        {detectedCircles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="font-medium">
                {detectedCircles.length} potential reference{detectedCircles.length > 1 ? 's' : ''} detected
              </span>
            </div>

            {/* Circle selector */}
            {detectedCircles.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {detectedCircles.map((circle, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={selectedCircle === index ? "default" : "outline"}
                    onClick={() => handleCircleSelect(index)}
                  >
                    Option {index + 1}
                    <Badge variant="secondary" className="ml-2">
                      {Math.round(circle.confidence)}%
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            {pixelsPerMM && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-medium text-success">
                  Scale Calibrated: {pixelsPerMM.toFixed(2)} pixels/mm
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Measurements will be accurate to within ±1mm
                </p>
              </div>
            )}
          </div>
        )}

        {/* No detection warning */}
        {detectedCircles.length === 0 && !isDetecting && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-warning">No reference object detected</p>
              <p className="mt-1">
                Make sure the reference object is clearly visible and not overlapping with the affected area.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleDetectReference}
            disabled={isDetecting}
            className="flex-1"
          >
            {isDetecting ? 'Detecting...' : 'Detect Reference Object'}
          </Button>

          {pixelsPerMM && (
            <Button
              onClick={handleConfirm}
              variant="default"
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Tip: You can skip calibration, but size estimates will be less accurate
        </p>
      </CardContent>
    </Card>
  );
};
