import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface HairProgressChartProps {
  data: Array<{
    date: string;
    moisture_level?: number;
    protein_balance?: number;
    scalp_health?: number;
    strand_integrity?: number;
    condition: string;
  }>;
}

export function HairProgressChart({ data }: HairProgressChartProps) {
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), "MMM d"),
    fullDate: format(new Date(item.date), "MMM d, yyyy"),
    moisture: item.moisture_level || 0,
    protein: item.protein_balance || 0,
    scalp: item.scalp_health || 0,
    strand: item.strand_integrity || 0,
    condition: item.condition,
  }));

  return (
    <Card className="shadow-medium border-primary/20 hover:shadow-strong transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          Hair Health Journey
        </CardTitle>
        <CardDescription>
          Track your hair health metrics over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              domain={[0, 100]}
              label={{
                value: "Health Score (%)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border-primary/20 border-2 rounded-lg p-4 shadow-strong backdrop-blur-sm">
                      <p className="font-bold text-base mb-3">{data.fullDate}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Condition: <span className="font-medium text-foreground">{data.condition}</span>
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm">Moisture</span>
                          </div>
                          <span className="text-sm font-medium">{data.moisture}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm">Protein</span>
                          </div>
                          <span className="text-sm font-medium">{data.protein}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-sm">Scalp</span>
                          </div>
                          <span className="text-sm font-medium">{data.scalp}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-sm">Strand</span>
                          </div>
                          <span className="text-sm font-medium">{data.strand}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  moisture: "Moisture Level",
                  protein: "Protein Balance",
                  scalp: "Scalp Health",
                  strand: "Strand Integrity",
                };
                return <span className="text-sm">{labels[value] || value}</span>;
              }}
            />
            <Line
              type="monotone"
              dataKey="moisture"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="protein"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="scalp"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="strand"
              stroke="#a855f7"
              strokeWidth={2}
              dot={{ fill: "#a855f7", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}