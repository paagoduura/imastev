import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Waves, Scissors, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

interface HairProfile {
  hair_texture?: {
    type: string;
    pattern_description: string;
    curl_pattern_uniformity: string;
    confidence: number;
  };
  porosity?: {
    level: string;
    indicators: string[];
    test_recommendation: string;
    confidence: number;
  };
  density?: {
    level: string;
    strand_thickness: string;
    overall_volume: string;
  };
  scalp_health?: {
    overall_score: number;
    conditions: Array<{
      condition: string;
      severity: string;
      confidence: number;
      explanation: string;
    }>;
    product_buildup?: {
      detected: boolean;
      level: string;
      areas: string[];
    };
    inflammation: boolean;
    follicle_health: string;
  };
  strand_health?: {
    overall_score: number;
    elasticity: string;
    breakage_level: string;
    split_ends: string;
    damage_type: string[];
    weak_points: string[];
  };
  moisture_protein_balance?: {
    status: string;
    recommendation: string;
  };
  chemical_status?: {
    is_chemically_treated: boolean;
    treatment_type: string;
    damage_level: string;
    regrowth_length_cm: number;
    line_of_demarcation: string;
  };
  treatment_recommendations?: {
    immediate: string[];
    weekly_routine: string[];
    products_to_use: string[];
    products_to_avoid: string[];
    styling_recommendations: string[];
    loc_method: string;
  };
}

interface HairResultsDisplayProps {
  hairProfile: HairProfile;
}

export function HairResultsDisplay({ hairProfile }: HairResultsDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getPorosityIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'normal': return <Droplets className="w-5 h-5 text-green-500" />;
      case 'high': return <Waves className="w-5 h-5 text-orange-500" />;
      default: return <Droplets className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hair Texture Card */}
      {hairProfile.hair_texture && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Type {hairProfile.hair_texture.type}</h3>
                  <p className="text-sm text-muted-foreground">Hair Texture Classification</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {hairProfile.hair_texture.confidence}% Confidence
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <p className="text-muted-foreground">{hairProfile.hair_texture.pattern_description}</p>
            <div className="mt-2">
              <Badge variant="outline">
                Pattern: {hairProfile.hair_texture.curl_pattern_uniformity}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Porosity & Density Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {hairProfile.porosity && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {getPorosityIcon(hairProfile.porosity.level)}
                Porosity Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={hairProfile.porosity.level === 'normal' ? 'default' : 'secondary'}
                    className="text-base capitalize"
                  >
                    {hairProfile.porosity.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {hairProfile.porosity.confidence}% sure
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Indicators:</p>
                  <ul className="text-sm space-y-1">
                    {hairProfile.porosity.indicators?.map((indicator, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-2 bg-muted rounded-lg text-xs">
                  <strong>Test:</strong> {hairProfile.porosity.test_recommendation}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hairProfile.density && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Hair Density</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Density</p>
                    <p className="text-lg font-semibold capitalize">{hairProfile.density.level}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Strand Thickness</p>
                    <p className="text-lg font-semibold capitalize">{hairProfile.density.strand_thickness}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall Volume</p>
                  <Badge variant="outline" className="capitalize">{hairProfile.density.overall_volume}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scalp Health */}
      {hairProfile.scalp_health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scalp Health</span>
              <span className={`text-2xl font-bold ${getScoreColor(hairProfile.scalp_health.overall_score)}`}>
                {hairProfile.scalp_health.overall_score}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={hairProfile.scalp_health.overall_score} className="h-3" />
            
            {hairProfile.scalp_health.conditions?.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Detected Conditions:</p>
                {hairProfile.scalp_health.conditions.map((condition, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{condition.condition}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={condition.severity === 'mild' ? 'secondary' : 'destructive'}>
                          {condition.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{condition.confidence}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{condition.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {hairProfile.scalp_health.product_buildup?.detected && (
              <div className="p-3 border border-orange-500/30 rounded-lg bg-orange-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-300">Product Buildup Detected</span>
                </div>
                <p className="text-sm">
                  Level: <strong>{hairProfile.scalp_health.product_buildup.level}</strong> • 
                  Areas: {hairProfile.scalp_health.product_buildup.areas?.join(', ')}
                </p>
              </div>
            )}

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                {hairProfile.scalp_health.inflammation ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )}
                <span>Inflammation: {hairProfile.scalp_health.inflammation ? 'Present' : 'None'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Follicle Health: {hairProfile.scalp_health.follicle_health}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strand Health */}
      {hairProfile.strand_health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Strand Health
              </span>
              <span className={`text-2xl font-bold ${getScoreColor(hairProfile.strand_health.overall_score)}`}>
                {hairProfile.strand_health.overall_score}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={hairProfile.strand_health.overall_score} className="h-3 mb-4" />
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">Elasticity</p>
                <p className="font-semibold capitalize">{hairProfile.strand_health.elasticity}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">Breakage Level</p>
                <p className="font-semibold capitalize">{hairProfile.strand_health.breakage_level}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">Split Ends</p>
                <p className="font-semibold capitalize">{hairProfile.strand_health.split_ends}</p>
              </div>
            </div>

            {hairProfile.strand_health.damage_type?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Damage Types:</p>
                <div className="flex flex-wrap gap-2">
                  {hairProfile.strand_health.damage_type.map((type, i) => (
                    <Badge key={i} variant="destructive">{type}</Badge>
                  ))}
                </div>
              </div>
            )}

            {hairProfile.strand_health.weak_points?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Weak Points:</p>
                <div className="flex flex-wrap gap-2">
                  {hairProfile.strand_health.weak_points.map((point, i) => (
                    <Badge key={i} variant="outline">{point}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chemical Status */}
      {hairProfile.chemical_status?.is_chemically_treated && (
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle>Chemical Treatment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Treatment Type</p>
                <p className="font-semibold capitalize">{hairProfile.chemical_status.treatment_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Damage Level</p>
                <Badge variant={hairProfile.chemical_status.damage_level === 'low' ? 'secondary' : 'destructive'}>
                  {hairProfile.chemical_status.damage_level}
                </Badge>
              </div>
              {hairProfile.chemical_status.regrowth_length_cm > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">New Growth</p>
                  <p className="font-semibold">{hairProfile.chemical_status.regrowth_length_cm} cm</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Line of Demarcation</p>
                <p className="font-semibold capitalize">{hairProfile.chemical_status.line_of_demarcation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treatment Recommendations */}
      {hairProfile.treatment_recommendations && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-primary">Personalized Hair Care Plan</CardTitle>
            <CardDescription>AI-generated recommendations for your hair type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hairProfile.treatment_recommendations.immediate?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Immediate Actions
                </h4>
                <ul className="space-y-1">
                  {hairProfile.treatment_recommendations.immediate.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hairProfile.treatment_recommendations.weekly_routine?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Weekly Routine</h4>
                <ul className="space-y-1">
                  {hairProfile.treatment_recommendations.weekly_routine.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {hairProfile.treatment_recommendations.products_to_use?.length > 0 && (
                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                  <h4 className="font-semibold mb-2 text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Products to Use
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {hairProfile.treatment_recommendations.products_to_use.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hairProfile.treatment_recommendations.products_to_avoid?.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <h4 className="font-semibold mb-2 text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Products to Avoid
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {hairProfile.treatment_recommendations.products_to_avoid.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {hairProfile.treatment_recommendations.loc_method && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <h4 className="font-semibold mb-1 text-primary">Moisture Method</h4>
                <p className="text-sm">{hairProfile.treatment_recommendations.loc_method}</p>
              </div>
            )}

            {hairProfile.treatment_recommendations.styling_recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Styling Tips</h4>
                <div className="flex flex-wrap gap-2">
                  {hairProfile.treatment_recommendations.styling_recommendations.map((tip, i) => (
                    <Badge key={i} variant="secondary">{tip}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Moisture/Protein Balance */}
      {hairProfile.moisture_protein_balance && (
        <Card>
          <CardHeader>
            <CardTitle>Moisture/Protein Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={hairProfile.moisture_protein_balance.status === 'balanced' ? 'default' : 'secondary'}
              className="mb-2"
            >
              {hairProfile.moisture_protein_balance.status?.replace(/_/g, ' ')}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {hairProfile.moisture_protein_balance.recommendation}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}