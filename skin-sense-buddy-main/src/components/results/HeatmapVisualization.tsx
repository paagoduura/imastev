import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HeatmapRegion {
  x: number;
  y: number;
  radius: number;
  feature: string;
  importance: number;
  color?: string;
}

interface Props {
  imageUrl: string;
  regions: HeatmapRegion[];
}

export const HeatmapVisualization = ({ imageUrl, regions }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeView, setActiveView] = useState<'heatmap' | 'original'>('heatmap');
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      if (activeView === 'heatmap' && regions.length > 0) {
        // Draw heatmap overlay
        regions.forEach((region, index) => {
          const x = region.x * canvas.width;
          const y = region.y * canvas.height;
          const radius = region.radius * Math.min(canvas.width, canvas.height);

          // Determine color based on importance or specified color
          let color;
          if (region.color) {
            color = region.color;
          } else if (region.importance >= 8) {
            color = 'rgba(239, 68, 68, 0.4)'; // Red for high importance
          } else if (region.importance >= 5) {
            color = 'rgba(251, 191, 36, 0.4)'; // Yellow for medium
          } else {
            color = 'rgba(59, 130, 246, 0.4)'; // Blue for low
          }

          // Draw glow effect
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
          gradient.addColorStop(0, color.replace('0.4', '0.6'));
          gradient.addColorStop(0.5, color);
          gradient.addColorStop(1, color.replace('0.4', '0.1'));

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Draw border
          ctx.strokeStyle = hoveredRegion === index 
            ? 'rgba(255, 255, 255, 1)' 
            : 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = hoveredRegion === index ? 4 : 2;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Draw crosshair at center
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 10, y);
          ctx.lineTo(x + 10, y);
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x, y + 10);
          ctx.stroke();

          // Draw index label
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.arc(x + radius - 15, y - radius + 15, 12, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((index + 1).toString(), x + radius - 15, y - radius + 15);
        });
      }
    };

    img.src = imageUrl;
  }, [imageUrl, regions, activeView, hoveredRegion]);

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return 'bg-destructive';
    if (importance >= 5) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Visual Analysis</span>
          <Badge variant="secondary">
            {regions.length} Key Region{regions.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Heatmap showing AI-identified diagnostic features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View toggle */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="heatmap">Heatmap View</TabsTrigger>
            <TabsTrigger value="original">Original Image</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Canvas */}
        <div className="rounded-lg overflow-hidden border bg-muted">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>

        {/* Region legend */}
        {regions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Identified Features</h4>
            <div className="space-y-2">
              {regions.map((region, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    hoveredRegion === index 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onMouseEnter={() => setHoveredRegion(index)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center 
                      text-xs font-bold text-white flex-shrink-0
                      ${getImportanceColor(region.importance)}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{region.feature}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Importance: {region.importance}/10
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Location: ({Math.round(region.x * 100)}%, {Math.round(region.y * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {regions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No specific regions highlighted for this analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
