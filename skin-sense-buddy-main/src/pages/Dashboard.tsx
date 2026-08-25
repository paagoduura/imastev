import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Crown,
  FlaskConical,
  History,
  Loader2,
  LogOut,
  Package,
  Scan,
  Scissors,
  ShoppingBag,
  Leaf,
  Stethoscope,
  User,
  Users,
  Video,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Profile from "@/pages/Profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";

type DashboardUser = { id: string; email?: string | null };
type DashboardProfile = { full_name?: string | null; age?: number | null; skin_type?: string | null; fitzpatrick_scale?: string | null };
type DashboardDiagnosis = { primary_condition?: string | null; confidence_score?: number | null; analysis_type?: string | null };
type DashboardScan = { id: string; scan_type?: string | null; created_at: string; image_url?: string | null; status?: string | null; diagnoses?: DashboardDiagnosis[] | null };
type DashboardSubscription = { subscription_plans?: { name?: string | null } | null } | null;

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showProfile = searchParams.get("section") === "profile";
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [scans, setScans] = useState<DashboardScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DashboardSubscription>(null);
  const [isClinician, setIsClinician] = useState(false);

  const checkUser = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    setUser(currentUser as DashboardUser);
    const [{ data: profileData }, { data: roleData }, { data: subData }, { data: scansData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", currentUser.id).single(),
      supabase.from("user_roles").select("*").eq("user_id", currentUser.id).eq("role", "clinician").maybeSingle(),
      supabase.from("subscriptions").select("*, subscription_plans (*)").eq("user_id", currentUser.id).eq("status", "active").maybeSingle(),
      supabase.from("scans").select("*, diagnoses ( primary_condition, confidence_score, triage_level, analysis_type )").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(5),
    ]);

    setProfile((profileData as DashboardProfile | null) || null);
    setIsClinician(!!roleData);
    setSubscription((subData as DashboardSubscription) || null);
    setScans((scansData as DashboardScan[] | null) || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-mark"><Leaf className="h-5 w-5" /></div>
        <Loader2 className="h-7 w-7 animate-spin" />
        <p>Preparing your care space…</p>
      </div>
    );
  }

  if (showProfile) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <main className="dashboard-shell">
          <div className="dashboard-container">
            <Profile embedded />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const initials = profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U";
  const planName = subscription?.subscription_plans?.name || "Essential";

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard-shell">
        <div className="dashboard-container">
          <section className="dashboard-action-deck" aria-labelledby="dashboard-actions-title">
            <div className="dashboard-action-heading">
              <div>
                <span className="dashboard-section-label">Your care space</span>
                <h1 id="dashboard-actions-title">Continue with <em>care.</em></h1>
                <p>Choose what you would like to do next.</p>
              </div>
              <div className="dashboard-action-member"><span className="dashboard-avatar">{initials.toUpperCase()}</span><span><strong>{planName}</strong><small>Care member</small></span><button type="button" className="dashboard-signout" onClick={handleLogout} aria-label="Sign out"><LogOut className="h-4 w-4" /><span>Sign out</span></button></div>
            </div>
            <div className="dashboard-action-grid">
              <DashboardAction icon={<Scan className="h-6 w-6" />} title="Start a scan" description="Understand your hair and skin" onClick={() => navigate("/scan")} tone="clay" />
              <DashboardAction icon={<Video className="h-6 w-6" />} title="Book a specialist" description="Bring your questions to an expert" onClick={() => navigate("/salon-booking")} tone="espresso" />
              <DashboardAction icon={<ShoppingBag className="h-6 w-6" />} title="Shop the edit" description="Build a considered ritual" onClick={() => navigate("/shop")} tone="olive" />
              <DashboardAction icon={<History className="h-6 w-6" />} title="View timeline" description="See your care progress" onClick={() => navigate("/timeline")} tone="sand" />
              <DashboardAction icon={<Calendar className="h-6 w-6" />} title="Appointments" description="Keep your next visit close" onClick={() => navigate("/telehealth")} tone="rose" />
              <DashboardAction icon={<User className="h-6 w-6" />} title="Your profile" description="Update your care preferences" onClick={() => navigate("/dashboard?section=profile")} tone="cream" />
            </div>
          </section>

          <section className="dashboard-lower-grid">
            <div className="dashboard-section dashboard-scans-card">
              <div className="dashboard-section-heading compact"><div><span className="dashboard-section-label">Your record</span><h2>Recent <em>insights.</em></h2></div>{scans.length > 0 && <button type="button" className="dashboard-view-link" onClick={() => navigate("/timeline")}>View all <ArrowUpRight className="h-3.5 w-3.5" /></button>}</div>
              {scans.length === 0 ? (
                <div className="dashboard-empty-state"><div className="dashboard-empty-icon"><Camera className="h-6 w-6" /></div><h3>Your first insight starts here.</h3><p>Begin with a scan and we’ll help you understand what your hair and skin are asking for.</p><Button type="button" className="dashboard-outline-button" onClick={() => navigate("/scan")}>Start your first scan <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
              ) : (
                <div className="dashboard-scan-list">{scans.map((scan) => <ScanRow key={scan.id} scan={scan} onClick={() => navigate(`/results/${scan.id}`)} />)}</div>
              )}
            </div>

            <div className="dashboard-side-stack">
              {(!profile?.age || !profile?.skin_type) && <div className="dashboard-profile-prompt"><div className="dashboard-prompt-icon"><Leaf className="h-4 w-4" /></div><div><span className="dashboard-section-label">Make it yours</span><h3>Complete your care profile.</h3><p>Give your care notes a little more of you.</p><button type="button" onClick={() => navigate("/dashboard?section=profile")}>Complete profile <ArrowUpRight className="h-3.5 w-3.5" /></button></div></div>}
              {isClinician && <div className="dashboard-clinician-prompt"><div className="dashboard-prompt-icon"><Stethoscope className="h-4 w-4" /></div><div><span className="dashboard-section-label">Studio access</span><h3>Clinician dashboard</h3><p>Manage your appointments and patients.</p><button type="button" onClick={() => navigate("/clinician")}>Open workspace <ArrowUpRight className="h-3.5 w-3.5" /></button></div></div>}
              <div className="dashboard-membership-card"><div className="dashboard-membership-top"><span className="dashboard-section-label">Your membership</span><Crown className="h-4 w-4" /></div><h3>{planName}<em>+</em></h3><p>Thoughtful care, considered products, and a specialist when you need one.</p><div className="dashboard-membership-meta"><span><Check className="h-3 w-3" /> Care plan</span><span><Check className="h-3 w-3" /> Member edit</span></div><button type="button" onClick={() => navigate("/subscription")}>Explore membership <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const DashboardAction = ({ icon, title, description, onClick, tone }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; tone: string }) => (
  <button type="button" className={`dashboard-action-card tone-${tone}`} onClick={onClick}>
    <span className="dashboard-action-icon">{icon}</span>
    <span className="dashboard-action-copy"><strong>{title}</strong><small>{description}</small></span>
    <ArrowUpRight className="dashboard-action-arrow h-4 w-4" />
  </button>
);

const CareActionCard = ({ tone, icon, eyebrow, title, text, action, onClick }: { tone: string; icon: React.ReactNode; eyebrow: string; title: string; text: string; action: string; onClick: () => void }) => (
  <button type="button" className={`dashboard-care-card tone-${tone}`} onClick={onClick}><span className="dashboard-care-icon">{icon}</span><span className="dashboard-card-eyebrow">{eyebrow}</span><strong>{title}</strong><span className="dashboard-card-text">{text}</span><span className="dashboard-card-action">{action} <ArrowUpRight className="h-4 w-4" /></span></button>
);

const UtilityCard = ({ icon, title, subtitle, route, onClick }: { icon: React.ReactNode; title: string; subtitle: string; route: string; onClick: () => void }) => (
  <button type="button" className="dashboard-utility-card" onClick={onClick}><span className="dashboard-utility-icon">{icon}</span><span className="dashboard-utility-route">{route.replace("/", "")}</span><strong>{title}</strong><small>{subtitle}</small><ArrowUpRight className="dashboard-utility-arrow h-4 w-4" /></button>
);

const ScanRow = ({ scan, onClick }: { scan: DashboardScan; onClick: () => void }) => {
  const isHairScan = scan.scan_type === "hair" || scan.diagnoses?.[0]?.analysis_type === "hair";
  const diagnosis = scan.diagnoses?.[0];
  return <button type="button" className="dashboard-scan-row" onClick={onClick}><span className={`dashboard-scan-thumb ${isHairScan ? "hair" : "skin"}`}>{scan.image_url ? <img src={scan.image_url} alt="" /> : isHairScan ? <Scissors className="h-5 w-5" /> : <Scan className="h-5 w-5" />}</span><span className="dashboard-scan-info"><span><strong>{diagnosis?.primary_condition || "Analysis pending"}</strong><Badge variant="outline">{isHairScan ? "Hair" : "Skin"}</Badge></span><small>{new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small></span>{diagnosis?.confidence_score ? <span className="dashboard-confidence"><span style={{ width: `${diagnosis.confidence_score}%` }} /><small>{diagnosis.confidence_score}%</small></span> : <ChevronRight className="h-4 w-4" />}</button>;
};

export default Dashboard;
