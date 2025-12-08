import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, History, User, LogOut, TrendingUp, Crown, Video, Users, Sparkles, Stethoscope, ShoppingBag, Package, Scan } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [isClinician, setIsClinician] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile && (!profile.full_name || !profile.age || !profile.skin_type || !profile.fitzpatrick_scale)) {
      navigate("/onboarding");
    }
  }, [profile, navigate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setProfile(profileData);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'clinician')
      .maybeSingle();
    
    setIsClinician(!!roleData);

    const { data: subData } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    
    setSubscription(subData);

    const { data: scansData } = await supabase
      .from('scans')
      .select(`
        *,
        diagnoses (
          primary_condition,
          confidence_score,
          triage_level,
          analysis_type
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setScans(scansData || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions - Scan Options */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Start New Analysis</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover:border-rose-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/10 group overflow-hidden relative" 
              onClick={() => navigate('/scan')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Scan className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Skin Analysis</h3>
                    <p className="text-sm text-muted-foreground">Analyze skin conditions, acne, pigmentation & more</p>
                  </div>
                  <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">Popular</Badge>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 group overflow-hidden relative" 
              onClick={() => navigate('/scan')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Hair Analysis</h3>
                    <p className="text-sm text-muted-foreground">Texture, porosity, scalp health for Nigerian hair</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">New</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secondary Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/timeline')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <History className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Progress Timeline</h3>
                  <p className="text-sm text-muted-foreground">View your journey</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/profile')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Profile Settings</h3>
                  <p className="text-sm text-muted-foreground">Update your info</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/shop')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Shop Products</h3>
                  <p className="text-sm text-muted-foreground">Hair & skin care</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Features */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Premium Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors relative" onClick={() => navigate('/subscription')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                    <Crown className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Subscription</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscription ? subscription.subscription_plans.name : 'Upgrade plan'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/telehealth')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Telehealth</h3>
                    <p className="text-sm text-muted-foreground">Book consultation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/family')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Family</h3>
                    <p className="text-sm text-muted-foreground">Manage accounts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/formulation')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Custom Formula</h3>
                    <p className="text-sm text-muted-foreground">AI-generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/orders')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-400 flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Orders</h3>
                    <p className="text-sm text-muted-foreground">View history</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Clinician Dashboard Link */}
        {isClinician && (
          <Card className="mb-8 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/clinician')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Clinician Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Manage your appointments and patients</p>
                  </div>
                </div>
                <Button>
                  Access Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Completion */}
        {(!profile?.age || !profile?.skin_type) && (
          <Card className="mb-8 border-warning/50 bg-warning/10">
            <CardHeader>
              <CardTitle className="text-lg">Complete Your Profile</CardTitle>
              <CardDescription>
                Add more details to get personalized recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/onboarding')}>Complete Profile</Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>Your latest skin and hair assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No scans yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your health journey with your first analysis
                </p>
                <Button onClick={() => navigate('/scan')}>
                  <Camera className="mr-2 h-4 w-4" />
                  Start First Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map((scan) => {
                  const isHairScan = scan.scan_type === 'hair' || scan.diagnoses?.[0]?.analysis_type === 'hair';
                  return (
                    <div
                      key={scan.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/results/${scan.id}`)}
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                        {scan.image_url && (
                          <img
                            src={scan.image_url}
                            alt="Scan"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                          isHairScan 
                            ? 'bg-gradient-to-br from-amber-500 to-yellow-500' 
                            : 'bg-gradient-to-br from-rose-500 to-orange-500'
                        }`}>
                          {isHairScan ? (
                            <Sparkles className="w-3 h-3 text-white" />
                          ) : (
                            <Scan className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {scan.diagnoses?.[0]?.primary_condition || 'Analysis Pending'}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={isHairScan 
                              ? 'bg-amber-500/10 text-amber-600' 
                              : 'bg-rose-500/10 text-rose-600'
                            }
                          >
                            {isHairScan ? 'Hair' : 'Skin'}
                          </Badge>
                          {scan.status === 'completed' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                              Completed
                            </span>
                          )}
                          {scan.status === 'analyzing' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">
                              Analyzing...
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(scan.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {scan.diagnoses?.[0]?.confidence_score && (
                          <div className="flex items-center gap-2 mt-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              {scan.diagnoses[0].confidence_score}% Confidence
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;