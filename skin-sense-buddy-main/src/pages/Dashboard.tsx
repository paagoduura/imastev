import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, History, User, LogOut, TrendingUp, Crown, Video, Users, Sparkles, Stethoscope, ShoppingBag, Package, Scan, ChevronRight, Calendar, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

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
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-amber-500 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white text-xl sm:text-2xl font-bold">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Ready to continue your natural beauty journey?
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="hidden sm:flex rounded-xl border-slate-200 dark:border-slate-700">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-display font-semibold">Start New Analysis</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div 
                className="group card-interactive p-5 sm:p-6 cursor-pointer" 
                onClick={() => navigate('/scan')}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Scan className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-lg">Skin Analysis</h3>
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs">Popular</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Analyze skin conditions, acne, pigmentation & aging signs</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>

              <div 
                className="group card-interactive p-5 sm:p-6 cursor-pointer" 
                onClick={() => navigate('/scan')}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-lg">Hair Analysis</h3>
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">4A-4C</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Texture, porosity & scalp health for Nigerian hair</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg sm:text-xl font-display font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <QuickActionCard 
                icon={<History className="h-5 w-5" />}
                title="Timeline"
                subtitle="View progress"
                gradient="from-purple-500 to-violet-500"
                onClick={() => navigate('/timeline')}
              />
              <QuickActionCard 
                icon={<Video className="h-5 w-5" />}
                title="Salon"
                subtitle="Book visit"
                gradient="from-amber-500 to-orange-500"
                onClick={() => navigate('/telehealth')}
              />
              <QuickActionCard 
                icon={<ShoppingBag className="h-5 w-5" />}
                title="Shop"
                subtitle="Products"
                gradient="from-pink-500 to-rose-500"
                onClick={() => navigate('/shop')}
              />
              <QuickActionCard 
                icon={<User className="h-5 w-5" />}
                title="Profile"
                subtitle="Settings"
                gradient="from-violet-500 to-purple-500"
                onClick={() => navigate('/profile')}
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg sm:text-xl font-display font-semibold mb-4">Premium Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <PremiumCard 
                icon={<Crown className="h-5 w-5" />}
                title="Subscription"
                value={subscription?.subscription_plans?.name || 'Free'}
                gradient="from-amber-400 to-orange-500"
                onClick={() => navigate('/subscription')}
              />
              <PremiumCard 
                icon={<Users className="h-5 w-5" />}
                title="Family"
                value="Manage"
                gradient="from-green-400 to-emerald-500"
                onClick={() => navigate('/family')}
              />
              <PremiumCard 
                icon={<Sparkles className="h-5 w-5" />}
                title="Custom Formula"
                value="AI-made"
                gradient="from-purple-400 to-violet-500"
                onClick={() => navigate('/formulation')}
              />
              <PremiumCard 
                icon={<Package className="h-5 w-5" />}
                title="Orders"
                value="History"
                gradient="from-pink-400 to-rose-500"
                onClick={() => navigate('/orders')}
              />
              <PremiumCard 
                icon={<Calendar className="h-5 w-5" />}
                title="Appointments"
                value="Schedule"
                gradient="from-sky-400 to-blue-500"
                onClick={() => navigate('/telehealth')}
              />
            </div>
          </div>

          {isClinician && (
            <div 
              className="mb-8 card-premium p-5 sm:p-6 cursor-pointer border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-amber-500/5" 
              onClick={() => navigate('/clinician')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center shadow-lg">
                    <Stethoscope className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">Clinician Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Manage your appointments and patients</p>
                  </div>
                </div>
                <Button className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-lg hidden sm:flex">
                  Access Dashboard
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {(!profile?.age || !profile?.skin_type) && (
            <div className="mb-8 card-premium p-5 sm:p-6 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground">Add more details to get personalized recommendations</p>
                </div>
                <Button onClick={() => navigate('/onboarding')} className="btn-premium">
                  Complete Profile
                </Button>
              </div>
            </div>
          )}

          <div className="card-premium overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Recent Analyses</h2>
                  <p className="text-sm text-muted-foreground">Your latest skin and hair assessments</p>
                </div>
                {scans.length > 0 && (
                  <Button variant="ghost" onClick={() => navigate('/timeline')} className="text-purple-600 hover:text-purple-700">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {scans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">No scans yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Start your health journey with your first AI-powered analysis
                  </p>
                  <Button onClick={() => navigate('/scan')} className="btn-premium">
                    <Camera className="mr-2 h-4 w-4" />
                    Start First Analysis
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scans.map((scan) => {
                    const isHairScan = scan.scan_type === 'hair' || scan.diagnoses?.[0]?.analysis_type === 'hair';
                    return (
                      <div
                        key={scan.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer group"
                        onClick={() => navigate(`/results/${scan.id}`)}
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative">
                          {scan.image_url ? (
                            <img
                              src={scan.image_url}
                              alt="Scan"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isHairScan ? (
                                <Sparkles className="w-8 h-8 text-amber-400" />
                              ) : (
                                <Scan className="w-8 h-8 text-rose-400" />
                              )}
                            </div>
                          )}
                          <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold truncate">
                              {scan.diagnoses?.[0]?.primary_condition || 'Analysis Pending'}
                            </h4>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${isHairScan 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              }`}
                            >
                              {isHairScan ? 'Hair' : 'Skin'}
                            </Badge>
                            {scan.status === 'completed' && (
                              <span className="badge-success text-xs">Completed</span>
                            )}
                            {scan.status === 'analyzing' && (
                              <span className="badge-warning text-xs">Analyzing...</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(scan.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          {scan.diagnoses?.[0]?.confidence_score && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-amber-500 rounded-full" 
                                  style={{ width: `${scan.diagnoses[0].confidence_score}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-purple-600">
                                {scan.diagnoses[0].confidence_score}%
                              </span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all flex-shrink-0 hidden sm:block" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const QuickActionCard = ({ 
  icon, 
  title, 
  subtitle, 
  gradient, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  gradient: string;
  onClick: () => void;
}) => (
  <div 
    className="card-interactive p-4 cursor-pointer group"
    onClick={onClick}
  >
    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
    <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

const PremiumCard = ({ 
  icon, 
  title, 
  value, 
  gradient, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  gradient: string;
  onClick: () => void;
}) => (
  <div 
    className="card-interactive p-4 cursor-pointer group text-center"
    onClick={onClick}
  >
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg mx-auto mb-2 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="font-medium text-xs sm:text-sm">{title}</h3>
    <p className="text-xs text-muted-foreground truncate">{value}</p>
  </div>
);

export default Dashboard;
