import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ConditionBreakdownProps {
  conditions: Array<{
    name: string;
    count: number;
    latestSeverity?: string;
    trend: "improving" | "stable" | "worsening";
  }>;
}

export function ConditionBreakdown({ conditions }: ConditionBreakdownProps) {
  const total = conditions.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className="shadow-medium border-primary/20 hover:shadow-strong transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-accent to-accent/60" />
          Condition Breakdown
        </CardTitle>
        <CardDescription>
          Distribution of detected conditions across all your scans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.map((condition, index) => {
          const percentage = (condition.count / total) * 100;
          return (
            <div 
              key={condition.name} 
              className="space-y-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-200 animate-in fade-in slide-in-from-left"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{condition.name}</span>
                  {condition.latestSeverity && (
                    <Badge 
                      variant="outline" 
                      className="text-xs capitalize border-primary/30 text-primary"
                    >
                      {condition.latestSeverity}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      condition.trend === "improving"
                        ? "default"
                        : condition.trend === "worsening"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs font-medium"
                  >
                    {condition.trend === "improving" && "↓ Improving"}
                    {condition.trend === "worsening" && "↑ Worsening"}
                    {condition.trend === "stable" && "→ Stable"}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {condition.count} scan{condition.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={percentage} className="h-2.5" />
                <p className="text-xs text-right text-muted-foreground font-medium">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
