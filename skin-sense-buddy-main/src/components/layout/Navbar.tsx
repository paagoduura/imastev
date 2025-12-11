import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, LayoutDashboard, ShoppingBag, TrendingUp, Menu, Sparkles, User, LogOut, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/scan", icon: Camera },
  { label: "Timeline", href: "/timeline", icon: TrendingUp },
  { label: "Salon", href: "/telehealth", icon: Video },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const NavLink = ({ link, mobile = false }: { link: typeof navLinks[0]; mobile?: boolean }) => {
    const isActive = location.pathname === link.href;
    const Icon = link.icon;
    
    return (
      <button
        onClick={() => {
          navigate(link.href);
          if (mobile) setIsOpen(false);
        }}
        className={`
          relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 no-tap-highlight
          ${mobile ? "w-full justify-start text-base" : "text-sm"}
          ${isActive 
            ? "bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow-lg shadow-purple-500/25" 
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }
        `}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
        <span>{link.label}</span>
      </button>
    );
  };

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled 
          ? 'glass-nav shadow-lg shadow-slate-900/5' 
          : 'bg-transparent'
        }
      `}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-18 items-center justify-between">
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group no-tap-highlight"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg shadow-purple-500/20 group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300 group-hover:scale-105 ring-2 ring-purple-100 dark:ring-purple-900/30">
                  <img 
                    src="/imstev-logo.png" 
                    alt="IMSTEV NATURALS" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-purple-400 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-display font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-amber-700 bg-clip-text text-transparent">
                  IMSTEV NATURALS
                </span>
                <span className="text-[9px] font-medium text-purple-500/70 dark:text-purple-400/70 -mt-0.5 tracking-wider">
                  Home of Nature's Beauty
                </span>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              {navLinks.map((link) => (
                <NavLink key={link.href} link={link} />
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span>Profile</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/scan")}
                    className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-lg shadow-purple-500/25 gap-2 px-5"
                  >
                    <Camera className="w-4 h-4" />
                    Start Scan
                  </Button>
                </>
              )}
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="relative w-10 h-10 rounded-xl">
                  <Menu className={`w-5 h-5 transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[320px] p-0 border-l-0 bg-white dark:bg-slate-900">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg shadow-purple-500/20 ring-2 ring-purple-100 dark:ring-purple-900/30">
                          <img 
                            src="/imstev-logo.png" 
                            alt="IMSTEV NATURALS" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-lg font-display font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-amber-700 bg-clip-text text-transparent">IMSTEV NATURALS</span>
                          <span className="text-[9px] font-medium text-purple-500/70 -mt-0.5 tracking-wider">Home of Nature's Beauty</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {navLinks.map((link) => (
                      <NavLink key={link.href} link={link} mobile />
                    ))}
                  </div>

                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 safe-bottom">
                    {user ? (
                      <>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 rounded-xl border-slate-200 dark:border-slate-700"
                          onClick={() => {
                            navigate("/profile");
                            setIsOpen(false);
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <span>My Profile</span>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-12 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          onClick={() => {
                            handleSignOut();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 font-medium"
                          onClick={() => {
                            navigate("/auth");
                            setIsOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                        <Button
                          className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-lg shadow-purple-500/25 rounded-xl"
                          onClick={() => {
                            navigate("/scan");
                            setIsOpen(false);
                          }}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Free Scan
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <div className="h-16 sm:h-18" />
    </>
  );
}
