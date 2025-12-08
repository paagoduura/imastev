import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, TrendingUp, TrendingDown, Calendar, Activity, AlertCircle, Loader2, Sparkles, Droplets, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { BeforeAfterComparison } from "@/components/timeline/BeforeAfterComparison";
import { ProgressChart } from "@/components/timeline/ProgressChart";
import { ConditionBreakdown } from "@/components/timeline/ConditionBreakdown";
import { StatCard } from "@/components/timeline/StatCard";
import { HairMetricsCard } from "@/components/timeline/HairMetricsCard";
import { HairProgressChart } from "@/components/timeline/HairProgressChart";
import { JourneyEmptyState } from "@/components/timeline/JourneyEmptyState";

interface Scan {
  id: string;
  created_at: string;
  image_url: string;
  thumbnail_url?: string;
  scan_type?: string;
  diagnoses: Array<{
    primary_condition: string;
    confidence_score: number;
    severity?: string;
    triage_level: string;
    analysis_type?: string;
    hair_profile?: {
      moisture_level?: number;
      protein_balance?: number;
      scalp_health?: number;
      strand_integrity?: number;
      porosity_score?: number;
      hair_type?: string;
    };
  }>;
}

export default function Timeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<Scan[]>([]);
  const [journeyTab, setJourneyTab] = useState<"skin" | "hair">("skin");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [comparisonPair, setComparisonPair] = useState<{ before: Scan; after: Scan } | null>(null);

  // Filter scans by journey type
  const skinScans = scans.filter(s => !s.scan_type || s.scan_type === 'skin');
  const hairScans = scans.filter(s => s.scan_type === 'hair');
  const currentScans = journeyTab === "skin" ? skinScans : hairScans;

  useEffect(() => {
    loadScans();
  }, []);

  useEffect(() => {
    // Auto-select first comparison pair for current journey
    if (currentScans.length >= 2) {
      setComparisonPair({
        before: currentScans[currentScans.length - 1],
        after: currentScans[0],
      });
    } else {
      setComparisonPair(null);
    }
  }, [currentScans.length, journeyTab]);

  const loadScans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("scans")
        .select(`
          *,
          diagnoses (
            primary_condition,
            confidence_score,
            severity,
            triage_level,
            analysis_type,
            hair_profile
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setScans((data as Scan[]) || []);
    } catch (error: any) {
      toast({
        title: "Error loading scans",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (scanList: Scan[]) => {
    if (scanList.length === 0) return null;

    const firstScan = scanList[scanList.length - 1];
    const latestScan = scanList[0];

    const daysSinceFirst = differenceInDays(
      new Date(latestScan.created_at),
      new Date(firstScan.created_at)
    );

    const firstConfidence = firstScan.diagnoses[0]?.confidence_score || 0;
    const latestConfidence = latestScan.diagnoses[0]?.confidence_score || 0;
    const overallImprovement = firstConfidence > 0 
      ? Math.round(((firstConfidence - latestConfidence) / firstConfidence) * 100)
      : 0;

    const avgConfidence = scanList.reduce((sum, scan) => {
      return sum + (scan.diagnoses[0]?.confidence_score || 0);
    }, 0) / scanList.length;

    const recentScans = scanList.slice(0, Math.min(3, scanList.length));
    const olderScans = scanList.slice(Math.min(3, scanList.length));
    
    const recentAvg = recentScans.reduce((sum, s) => sum + (s.diagnoses[0]?.confidence_score || 0), 0) / recentScans.length;
    const olderAvg = olderScans.length > 0 
      ? olderScans.reduce((sum, s) => sum + (s.diagnoses[0]?.confidence_score || 0), 0) / olderScans.length
      : recentAvg;

    const trendValue = olderAvg > 0 ? Math.round(((olderAvg - recentAvg) / olderAvg) * 100) : 0;

    return {
      totalScans: scanList.length,
      daysSinceFirst: daysSinceFirst || 0,
      overallImprovement,
      avgConfidence: avgConfidence.toFixed(1),
      trendValue,
      isImproving: trendValue > 0,
    };
  };

  const getHairStats = (scanList: Scan[]) => {
    if (scanList.length === 0) return null;
    
    const latestDiagnosis = scanList[0]?.diagnoses[0];
    const previousDiagnosis = scanList[1]?.diagnoses[0];
    
    return {
      latestMetrics: latestDiagnosis?.hair_profile || {},
      previousMetrics: previousDiagnosis?.hair_profile || {},
    };
  };

  const getConditionBreakdown = (scanList: Scan[]) => {
    const conditionMap: Record<string, { count: number; latestSeverity?: string; severities: string[] }> = {};

    scanList.forEach((scan) => {
      const diagnosis = scan.diagnoses[0];
      if (!diagnosis) return;

      const condition = diagnosis.primary_condition;
      if (!conditionMap[condition]) {
        conditionMap[condition] = { count: 0, severities: [] };
      }
      conditionMap[condition].count++;
      if (diagnosis.severity) {
        conditionMap[condition].severities.push(diagnosis.severity);
        conditionMap[condition].latestSeverity = diagnosis.severity;
      }
    });

    return Object.entries(conditionMap).map(([name, data]) => {
      const trend = calculateTrend(data.severities);
      return { name, count: data.count, latestSeverity: data.latestSeverity, trend };
    });
  };

  const calculateTrend = (severities: string[]): "improving" | "stable" | "worsening" => {
    if (severities.length < 2) return "stable";
    const levels: Record<string, number> = { mild: 1, moderate: 2, severe: 3 };
    const first = levels[severities[severities.length - 1]?.toLowerCase()] || 0;
    const last = levels[severities[0]?.toLowerCase()] || 0;
    if (first > last) return "improving";
    if (first < last) return "worsening";
    return "stable";
  };

  const getChartData = (scanList: Scan[]) => {
    return scanList.slice().reverse().map((scan) => ({
      date: scan.created_at,
      confidence_score: scan.diagnoses[0]?.confidence_score || 0,
      condition: scan.diagnoses[0]?.primary_condition || "Unknown",
      severity: scan.diagnoses[0]?.severity,
    }));
  };

  const getHairChartData = (scanList: Scan[]) => {
    return scanList.slice().reverse().map((scan) => {
      const hp = scan.diagnoses[0]?.hair_profile || {};
      return {
        date: scan.created_at,
        moisture_level: hp.moisture_level || 0,
        protein_balance: hp.protein_balance || 0,
        scalp_health: hp.scalp_health || 0,
        strand_integrity: hp.strand_integrity || 0,
        condition: scan.diagnoses[0]?.primary_condition || "Unknown",
      };
    });
  };

  const stats = calculateStats(currentScans);
  const conditions = getConditionBreakdown(currentScans);
  const chartData = getChartData(currentScans);
  const hairChartData = getHairChartData(hairScans);
  const hairStats = getHairStats(hairScans);

  const uniqueConditions = ["all", ...new Set(currentScans.map(s => s.diagnoses[0]?.primary_condition).filter(Boolean))];
  const filteredScans = selectedCondition === "all"
    ? currentScans
    : currentScans.filter(s => s.diagnoses[0]?.primary_condition === selectedCondition);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary-light/10 to-background">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
          </div>
          <p className="text-muted-foreground font-medium">Analyzing your journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
      <div className="container max-w-7xl py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Your Journey
                </h1>
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground mt-1">Track your hair & skin health over time</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/scan")}
            className="shadow-medium hover:shadow-strong transition-all duration-300"
          >
            <Camera className="w-4 h-4 mr-2" />
            New Scan
          </Button>
        </div>

        {/* Journey Type Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 rounded-xl bg-muted/50 border border-border">
            <button
              onClick={() => { setJourneyTab("skin"); setSelectedCondition("all"); }}
              className={`relative px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                journeyTab === "skin" 
                  ? "bg-gradient-to-r from-primary to-primary-glow text-white shadow-lg" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                <span>Skin Journey</span>
                {skinScans.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {skinScans.length}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => { setJourneyTab("hair"); setSelectedCondition("all"); }}
              className={`relative px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                journeyTab === "hair" 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                <span>Hair Journey</span>
                {hairScans.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {hairScans.length}
                  </Badge>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {currentScans.length === 0 ? (
          <div className="py-12">
            <JourneyEmptyState type={journeyTab} />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            {stats && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
                  <StatCard
                    title="Total Scans"
                    value={stats.totalScans}
                    subtitle={`${journeyTab === "skin" ? "Skin" : "Hair"} analyses`}
                    icon={Camera}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                  <StatCard
                    title="Overall Improvement"
                    value={`${stats.overallImprovement > 0 ? "+" : ""}${stats.overallImprovement}%`}
                    subtitle="Since first scan"
                    icon={stats.overallImprovement > 0 ? TrendingDown : TrendingUp}
                    trend={{
                      value: Math.abs(stats.overallImprovement),
                      isPositive: stats.overallImprovement > 0,
                    }}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                  <StatCard
                    title="Days Tracking"
                    value={stats.daysSinceFirst}
                    subtitle="Journey duration"
                    icon={Calendar}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                  <StatCard
                    title="Recent Trend"
                    value={`${stats.isImproving ? "↓" : "↑"} ${Math.abs(stats.trendValue)}%`}
                    subtitle="Last 3 scans"
                    icon={Activity}
                    trend={{
                      value: Math.abs(stats.trendValue),
                      isPositive: stats.isImproving,
                    }}
                  />
                </div>
              </div>
            )}

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="comparison" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Before & After
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Scan History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid lg:grid-cols-2 gap-6">
                  {journeyTab === "skin" ? (
                    <>
                      <div className="animate-in fade-in slide-in-from-left duration-700 delay-100">
                        <ProgressChart data={chartData} />
                      </div>
                      <div className="animate-in fade-in slide-in-from-right duration-700 delay-200">
                        <ConditionBreakdown conditions={conditions} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="animate-in fade-in slide-in-from-left duration-700 delay-100">
                        <HairProgressChart data={hairChartData} />
                      </div>
                      <div className="animate-in fade-in slide-in-from-right duration-700 delay-200">
                        {hairStats && (
                          <HairMetricsCard 
                            metrics={hairStats.latestMetrics} 
                            previousMetrics={hairStats.previousMetrics}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Condition breakdown for hair too */}
                {journeyTab === "hair" && conditions.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                    <ConditionBreakdown conditions={conditions} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comparison" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {currentScans.length < 2 ? (
                  <Card className="border-dashed shadow-soft">
                    <CardContent className="p-12 text-center">
                      <div className="relative inline-block mb-6">
                        <AlertCircle className="w-16 h-16 text-muted-foreground" />
                        <div className="absolute inset-0 blur-xl bg-muted-foreground/20 animate-pulse" />
                      </div>
                      <CardTitle className="mb-2">More Data Needed</CardTitle>
                      <p className="text-muted-foreground mb-6">
                        Take at least 2 {journeyTab} scans to unlock powerful before/after comparisons
                      </p>
                      <Button className="shadow-medium" onClick={() => navigate("/scan")}>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Another Scan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Before Scan</label>
                        <Select
                          value={comparisonPair?.before.id}
                          onValueChange={(id) => {
                            const scan = currentScans.find(s => s.id === id);
                            if (scan && comparisonPair) {
                              setComparisonPair({ ...comparisonPair, before: scan });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentScans.map((scan) => (
                              <SelectItem key={scan.id} value={scan.id}>
                                {format(new Date(scan.created_at), "MMM d, yyyy")} -{" "}
                                {scan.diagnoses[0]?.primary_condition || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">After Scan</label>
                        <Select
                          value={comparisonPair?.after.id}
                          onValueChange={(id) => {
                            const scan = currentScans.find(s => s.id === id);
                            if (scan && comparisonPair) {
                              setComparisonPair({ ...comparisonPair, after: scan });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentScans.map((scan) => (
                              <SelectItem key={scan.id} value={scan.id}>
                                {format(new Date(scan.created_at), "MMM d, yyyy")} -{" "}
                                {scan.diagnoses[0]?.primary_condition || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {comparisonPair && (
                      <BeforeAfterComparison
                        beforeScan={comparisonPair.before}
                        afterScan={comparisonPair.after}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-card border shadow-soft">
                  <div>
                    <h3 className="text-lg font-semibold">{journeyTab === "skin" ? "Skin" : "Hair"} Scan History</h3>
                    <p className="text-sm text-muted-foreground">{filteredScans.length} scans recorded</p>
                  </div>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueConditions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition === "all" ? "All Conditions" : condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredScans.map((scan, index) => {
                    const diagnosis = scan.diagnoses[0];
                    const prevScan = filteredScans[index + 1];
                    const improvement = prevScan?.diagnoses[0]
                      ? Math.round(
                          ((prevScan.diagnoses[0].confidence_score - diagnosis.confidence_score) /
                            prevScan.diagnoses[0].confidence_score) *
                            100
                        )
                      : null;

                    return (
                      <Card
                        key={scan.id}
                        className="group cursor-pointer hover:shadow-strong hover:scale-[1.02] transition-all duration-300 border-primary/20 overflow-hidden animate-in fade-in zoom-in-95"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => navigate(`/results/${scan.id}`)}
                      >
                        <div className="aspect-video relative overflow-hidden bg-muted">
                          <img
                            src={scan.thumbnail_url || scan.image_url}
                            alt={`Scan from ${format(new Date(scan.created_at), "MMM d, yyyy")}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <Badge 
                            className={`absolute top-3 left-3 ${
                              scan.scan_type === 'hair' 
                                ? 'bg-amber-500/90' 
                                : 'bg-primary/90'
                            }`}
                          >
                            {scan.scan_type === 'hair' ? 'Hair' : 'Skin'}
                          </Badge>
                          {improvement !== null && improvement !== 0 && (
                            <Badge
                              variant={improvement > 0 ? "default" : "destructive"}
                              className="absolute top-3 right-3 shadow-strong backdrop-blur-sm"
                            >
                              {improvement > 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                              {Math.abs(improvement)}%
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                              {format(new Date(scan.created_at), "MMM d, yyyy")}
                            </p>
                            {diagnosis?.severity && (
                              <Badge 
                                variant="outline" 
                                className="text-xs capitalize border-primary/30 text-primary"
                              >
                                {diagnosis.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-base group-hover:text-primary transition-colors">
                            {diagnosis?.primary_condition || "Unknown"}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-medium text-primary">
                              {diagnosis?.confidence_score.toFixed(1)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}