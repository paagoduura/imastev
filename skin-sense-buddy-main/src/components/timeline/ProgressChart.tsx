import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";

interface ProgressChartProps {
  data: Array<{
    date: string;
    confidence_score: number;
    condition: string;
    severity?: string;
  }>;
}

export function ProgressChart({ data }: ProgressChartProps) {
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), "MMM d"),
    score: 100 - item.confidence_score, // Invert so higher is better
    confidence: item.confidence_score,
    condition: item.condition,
  }));

  return (
    <Card className="shadow-medium border-primary/20 hover:shadow-strong transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-primary to-primary-glow" />
          Progress Over Time
        </CardTitle>
        <CardDescription>
          Track your skin health improvement journey with detailed analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Improvement Score",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border-primary/20 border-2 rounded-lg p-4 shadow-strong backdrop-blur-sm">
                      <p className="font-bold text-base mb-2">{payload[0].payload.date}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-muted-foreground">Condition:</span>
                          <span className="text-sm font-medium">{payload[0].payload.condition}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-muted-foreground">Confidence:</span>
                          <span className="text-sm font-medium">{payload[0].payload.confidence.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t">
                          <span className="text-sm font-medium text-primary">Score:</span>
                          <span className="text-base font-bold text-primary">{payload[0].value}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
