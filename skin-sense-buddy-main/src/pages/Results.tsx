import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Download, TrendingUp, Calendar, ArrowLeft, Sparkles, Scan } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HeatmapVisualization } from "@/components/results/HeatmapVisualization";
import { HairResultsDisplay } from "@/components/results/HairResultsDisplay";

const Results = () => {
  const navigate = useNavigate();
  const { id: scanId } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [scan, setScan] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (scanId) {
      fetchResults();
    } else {
      navigate('/dashboard');
    }
  }, [scanId]);

  const fetchResults = async () => {
    try {
      // Fetch scan
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (scanError) throw scanError;
      setScan(scanData);

      // Fetch diagnosis
      const { data: diagnosisData, error: diagnosisError } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('scan_id', scanId)
        .single();

      if (diagnosisError) throw diagnosisError;
      setDiagnosis(diagnosisData);

      // Fetch treatment plan with products
      const { data: treatmentData } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('diagnosis_id', diagnosisData.id)
        .single();

      setTreatmentPlan(treatmentData);

      if (treatmentData?.product_recommendations) {
        const recommendations = treatmentData.product_recommendations;
        if (Array.isArray(recommendations)) {
          setProducts(recommendations);
        }
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error loading results",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTriageMessage = (level: string, isHair: boolean) => {
    if (isHair) {
      switch (level) {
        case 'self_care':
          return {
            title: 'Home Care Recommended',
            description: 'This can be managed with proper hair care routine and products. Follow the personalized recommendations below.'
          };
        case 'see_trichologist':
          return {
            title: 'Consult a Trichologist',
            description: 'We recommend scheduling an appointment with a hair specialist for professional evaluation.'
          };
        case 'see_dermatologist':
          return {
            title: 'See a Dermatologist',
            description: 'This scalp condition requires evaluation by a dermatology specialist.'
          };
        case 'urgent_care':
          return {
            title: 'Urgent Medical Attention',
            description: 'Please seek immediate medical attention. This condition may require urgent care.'
          };
        default:
          return {
            title: 'Professional Evaluation Recommended',
            description: 'Consult a hair or scalp specialist for proper diagnosis and treatment.'
          };
      }
    }

    switch (level) {
      case 'self_care':
        return {
          title: 'Self-Care Recommended',
          description: 'This condition can be managed with over-the-counter products and lifestyle changes.'
        };
      case 'see_gp':
        return {
          title: 'Consult Your GP',
          description: 'We recommend scheduling an appointment with your general practitioner.'
        };
      case 'see_dermatologist':
        return {
          title: 'See a Dermatologist',
          description: 'This condition requires professional evaluation by a dermatology specialist.'
        };
      case 'urgent_care':
        return {
          title: 'Urgent Medical Attention',
          description: 'Please seek immediate medical attention.'
        };
      default:
        return {
          title: 'Professional Evaluation Recommended',
          description: 'Consult a healthcare professional for proper diagnosis and treatment.'
        };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "bg-success";
    if (confidence >= 40) return "bg-warning";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't find analysis results for this scan.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isHairAnalysis = diagnosis.analysis_type === 'hair' || scan?.scan_type === 'hair';
  const triageInfo = getTriageMessage(diagnosis.triage_level, isHairAnalysis);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-background p-4">
      <div className="container mx-auto max-w-5xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-foreground">
                {isHairAnalysis ? 'Hair' : 'Skin'} Analysis Results
              </h1>
              <Badge 
                variant="secondary" 
                className={isHairAnalysis 
                  ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700" 
                  : "bg-gradient-to-r from-rose-500/20 to-orange-500/20 text-rose-700"
                }
              >
                {isHairAnalysis ? (
                  <><Sparkles className="w-3 h-3 mr-1" /> Hair</>
                ) : (
                  <><Scan className="w-3 h-3 mr-1" /> Skin</>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">AI-powered assessment completed</p>
          </div>
        </div>

        {/* Original Image */}
        {scan?.image_url && (
          <Card>
            <CardContent className="p-6">
              <div className="max-w-md mx-auto rounded-lg overflow-hidden">
                <img
                  src={scan.image_url}
                  alt={isHairAnalysis ? "Hair scan" : "Skin scan"}
                  className="w-full h-auto"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Heatmap Visualization (for skin) */}
        {!isHairAnalysis && diagnosis?.heatmap_regions && diagnosis.heatmap_regions.length > 0 && (
          <HeatmapVisualization
            imageUrl={scan?.image_url || ''}
            regions={diagnosis.heatmap_regions}
          />
        )}

        {/* Triage Alert */}
        <Card className={`border-2 ${
          diagnosis.triage_level === 'urgent_care' ? 'border-destructive bg-destructive/10' :
          diagnosis.triage_level === 'self_care' ? 'border-primary bg-primary-light/20' :
          'border-warning bg-warning/10'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                diagnosis.triage_level === 'urgent_care' ? 'bg-destructive/20' :
                diagnosis.triage_level === 'self_care' ? 'bg-primary-light' :
                'bg-warning/20'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  diagnosis.triage_level === 'urgent_care' ? 'text-destructive' :
                  diagnosis.triage_level === 'self_care' ? 'text-primary' :
                  'text-warning'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{triageInfo.title}</h3>
                <p className="text-muted-foreground">{triageInfo.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hair-specific results */}
        {isHairAnalysis && diagnosis.hair_profile && (
          <HairResultsDisplay hairProfile={diagnosis.hair_profile} />
        )}

        {/* Skin-specific results: Diagnoses */}
        {!isHairAnalysis && diagnosis.conditions && (
          <Card>
            <CardHeader>
              <CardTitle>Probable Diagnoses</CardTitle>
              <CardDescription>Ranked by confidence level with AI explanations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {diagnosis.conditions.map((condition: any, index: number) => (
                <div key={index} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{condition.condition}</h3>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {condition.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{condition.explanation}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-primary">{condition.confidence}%</div>
                      <div className="text-xs text-muted-foreground">Confidence</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Confidence Level</span>
                      <span>{condition.confidence}%</span>
                    </div>
                    <Progress value={condition.confidence} className={`h-2 ${getConfidenceColor(condition.confidence)}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Treatment Plan (for both types) */}
        {treatmentPlan && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-primary">Treatment Plan</CardTitle>
              <CardDescription>Personalized recommendations based on your analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{treatmentPlan.recommendations}</p>
              
              {treatmentPlan.ingredients_to_use?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-success">Ingredients to Use:</h4>
                  <div className="flex flex-wrap gap-2">
                    {treatmentPlan.ingredients_to_use.map((ingredient: string, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-success/10">{ingredient}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {treatmentPlan.ingredients_to_avoid?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-destructive">Ingredients to Avoid:</h4>
                  <div className="flex flex-wrap gap-2">
                    {treatmentPlan.ingredients_to_avoid.map((ingredient: string, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-destructive/10">{ingredient}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {treatmentPlan.lifestyle_tips?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Lifestyle Tips:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {treatmentPlan.lifestyle_tips.map((tip: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {treatmentPlan.follow_up_days && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Follow-up:</strong> We recommend checking your progress in {treatmentPlan.follow_up_days} days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Skin Profile (for skin analysis) */}
        {!isHairAnalysis && diagnosis.skin_profile && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skin Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnosis.skin_profile.skin_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Skin Type</span>
                    <Badge variant="outline">{diagnosis.skin_profile.skin_type}</Badge>
                  </div>
                )}
                {diagnosis.skin_profile.fitzpatrick_scale && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fitzpatrick Scale</span>
                    <Badge variant="outline">Type {diagnosis.skin_profile.fitzpatrick_scale}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/timeline')}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Track Progress
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/telehealth')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Consultation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommended Products */}
        {products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended Products</CardTitle>
              <CardDescription>
                {isHairAnalysis ? 'Hair care products' : 'Skincare products'} tailored to your condition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {products.map((product, index) => (
                  <ProductCard key={index} {...product} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="flex-1" onClick={() => navigate('/timeline')}>
            <TrendingUp className="mr-2 h-5 w-5" />
            Track Progress
          </Button>
          <Button size="lg" variant="outline" className="flex-1">
            <Download className="mr-2 h-5 w-5" />
            Download Report
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/scan')}>
            New Scan
          </Button>
        </div>

        {/* Medical Disclaimer */}
        <Card className="bg-muted/50 border-muted">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This analysis is provided for informational purposes only and should not be considered medical advice. 
              Consult a licensed {isHairAnalysis ? 'trichologist or dermatologist' : 'dermatologist'} for diagnosis and treatment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ProductCard = ({ name, category, description }: { name: string; category: string; description: string }) => (
  <div className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
    <div className="mb-2">
      <Badge variant="secondary" className="text-xs">{category}</Badge>
    </div>
    <h4 className="font-semibold mb-1">{name}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Results;