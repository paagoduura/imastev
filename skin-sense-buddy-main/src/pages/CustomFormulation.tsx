import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Formulation {
  id: string;
  formulation_name: string;
  ingredients: any;
  instructions: string;
  expected_benefits: any;
  contraindications: string;
  estimated_cost_ngn: number;
  created_at: string;
}

interface Diagnosis {
  id: string;
  primary_condition: string;
  conditions: any;
  created_at: string;
  scans: {
    image_url: string;
  };
}

export default function CustomFormulation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [recentDiagnoses, setRecentDiagnoses] = useState<Diagnosis[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load existing formulations
      const { data: formulationsData, error: formulationsError } = await supabase
        .from("custom_formulations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (formulationsError) throw formulationsError;
      setFormulations(formulationsData || []);

      // Load recent diagnoses for generating new formulations
      const { data: diagnosesData, error: diagnosesError } = await supabase
        .from("diagnoses")
        .select(`
          *,
          scans (image_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (diagnosesError) throw diagnosesError;
      setRecentDiagnoses(diagnosesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormulation = async (diagnosisId: string) => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-formulation", {
        body: { diagnosisId, userId: user.id },
      });

      if (error) throw error;

      toast({
        title: "Formulation generated",
        description: "Your custom formulation is ready!",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Custom Formulations</h1>
          <p className="text-muted-foreground">
            AI-powered personalized skincare formulations tailored to your skin condition
          </p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate New</TabsTrigger>
            <TabsTrigger value="history">My Formulations</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate from Recent Scans</CardTitle>
                <CardDescription>
                  Select a diagnosis to create a personalized formulation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentDiagnoses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent diagnoses found. Complete a scan to get started.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentDiagnoses.map((diagnosis) => (
                      <Card key={diagnosis.id} className="overflow-hidden">
                        <div className="aspect-video relative">
                          <img
                            src={diagnosis.scans?.image_url}
                            alt="Scan"
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h4 className="font-semibold">{diagnosis.primary_condition}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(diagnosis.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => handleGenerateFormulation(diagnosis.id)}
                            disabled={generating}
                          >
                            {generating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Formulation
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {formulations.length === 0 ? (
              <Card className="text-center p-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No formulations yet</h3>
                <p className="text-muted-foreground">
                  Generate your first custom formulation to get started
                </p>
              </Card>
            ) : (
              formulations.map((formulation) => (
                <Card key={formulation.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{formulation.formulation_name}</CardTitle>
                        <CardDescription>
                          Created {new Date(formulation.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        ₦{formulation.estimated_cost_ngn?.toLocaleString() || "N/A"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Ingredients</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(formulation.ingredients || {}).map(([ingredient, percentage]) => (
                          <Badge key={ingredient} variant="outline">
                            {ingredient}: {String(percentage)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {formulation.instructions}
                      </p>
                    </div>
                    {formulation.expected_benefits && Array.isArray(formulation.expected_benefits) && (
                      <div>
                        <h4 className="font-semibold mb-2">Expected Benefits</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {formulation.expected_benefits.map((benefit: any, index: number) => (
                            <li key={index}>{String(benefit)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {formulation.contraindications && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                          Contraindications
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {formulation.contraindications}
                        </p>
                      </div>
                    )}
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
