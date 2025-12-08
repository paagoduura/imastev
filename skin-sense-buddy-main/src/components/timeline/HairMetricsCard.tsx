import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Droplets, Leaf, Scissors, Sparkles, Wind } from "lucide-react";

interface HairMetric {
  label: string;
  value: number;
  previousValue?: number;
  icon: React.ReactNode;
  description: string;
}

interface HairMetricsCardProps {
  metrics: {
    moisture_level?: number;
    protein_balance?: number;
    scalp_health?: number;
    strand_integrity?: number;
    porosity_score?: number;
  };
  previousMetrics?: {
    moisture_level?: number;
    protein_balance?: number;
    scalp_health?: number;
    strand_integrity?: number;
    porosity_score?: number;
  };
}

export function HairMetricsCard({ metrics, previousMetrics }: HairMetricsCardProps) {
  const hairMetrics: HairMetric[] = [
    {
      label: "Moisture Level",
      value: metrics.moisture_level || 0,
      previousValue: previousMetrics?.moisture_level,
      icon: <Droplets className="w-4 h-4 text-blue-500" />,
      description: "Hair hydration status",
    },
    {
      label: "Protein Balance",
      value: metrics.protein_balance || 0,
      previousValue: previousMetrics?.protein_balance,
      icon: <Leaf className="w-4 h-4 text-green-500" />,
      description: "Structural protein health",
    },
    {
      label: "Scalp Health",
      value: metrics.scalp_health || 0,
      previousValue: previousMetrics?.scalp_health,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      description: "Scalp condition score",
    },
    {
      label: "Strand Integrity",
      value: metrics.strand_integrity || 0,
      previousValue: previousMetrics?.strand_integrity,
      icon: <Scissors className="w-4 h-4 text-purple-500" />,
      description: "Hair strand strength",
    },
    {
      label: "Porosity Score",
      value: metrics.porosity_score || 0,
      previousValue: previousMetrics?.porosity_score,
      icon: <Wind className="w-4 h-4 text-cyan-500" />,
      description: "Moisture absorption rate",
    },
  ];

  const getChangeIndicator = (current: number, previous?: number) => {
    if (!previous) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 1) return null;
    
    return (
      <Badge 
        variant={diff > 0 ? "default" : "destructive"} 
        className="text-xs px-1.5 py-0"
      >
        {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
      </Badge>
    );
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-amber-500";
    if (value >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="shadow-medium border-primary/20 hover:shadow-strong transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          Hair Health Metrics
        </CardTitle>
        <CardDescription>
          Comprehensive analysis of your hair health indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {hairMetrics.map((metric, index) => (
          <div 
            key={metric.label} 
            className="space-y-2 animate-in fade-in slide-in-from-left"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  {metric.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{metric.label}</p>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getChangeIndicator(metric.value, metric.previousValue)}
                <span className="font-bold text-lg">{metric.value.toFixed(0)}%</span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={metric.value} 
                className="h-2"
              />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getHealthColor(metric.value)}`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}