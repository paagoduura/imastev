import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, LayoutDashboard, ShoppingBag, TrendingUp, Menu, User, LogOut, Video, Home, Users } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { CompactBeautyShowcaseCarousel } from "@/components/layout/BeautyShowcaseCarousel";

const defaultNavLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/scan", icon: Camera },
  { label: "Timeline", href: "/timeline", icon: TrendingUp },
  { label: "Community", href: "/community", icon: Users },
  { label: "Salon", href: "/salon-booking", icon: Video },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
];

const homeNavLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Community", href: "/community", icon: Users },
  { label: "Salon", href: "/salon-booking", icon: Video },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = location.pathname === "/";
  const navLinks = isHomePage ? homeNavLinks : defaultNavLinks;

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
            ? "bg-primary text-white shadow-lg shadow-primary/20" 
            : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5 dark:hover:text-white dark:hover:bg-slate-800"
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
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3 sm:h-[72px]">
            <button 
              onClick={() => navigate("/")}
              className="flex min-w-0 items-center gap-2 group no-tap-highlight"
            >
              <div className="relative">
                <div className="h-9 w-9 overflow-hidden rounded-full shadow-lg shadow-primary/10 ring-2 ring-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/20 sm:h-11 sm:w-11">
                  <img 
                    src="/imstev-logo.jpeg" 
                    alt="IMSTEV NATURALS" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </div>
              <div className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-display font-bold text-primary sm:text-lg">
                  IMSTEV NATURALS
                </span>
                <span className="hidden text-[9px] font-medium tracking-wider text-primary/70 dark:text-primary/70 sm:block">
                  Home of Nature's Beauty
                </span>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-white/90 backdrop-blur-sm border border-primary/10 shadow-sm">
              {navLinks.map((link) => (
                <NavLink key={link.href} link={link} />
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  {!isHomePage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/profile")}
                      className="gap-2 text-slate-600 hover:bg-transparent hover:text-slate-600 dark:text-slate-300 dark:hover:bg-transparent dark:hover:text-slate-300"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span>Profile</span>
                    </Button>
                  )}
                  {isHomePage && (
                    <Button
                      size="sm"
                      onClick={() => navigate("/scan")}
                      className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 px-5"
                    >
                      <Camera className="w-4 h-4" />
                      Start Scan
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-white"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/scan")}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 px-5"
                  >
                    <Camera className="w-4 h-4" />
                    Start Scan
                  </Button>
                </>
              )}
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="relative h-10 w-10 shrink-0 rounded-xl">
                  <Menu className={`w-5 h-5 transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[320px] p-0 border-l-0 bg-white dark:bg-slate-900">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg shadow-primary/10 ring-2 ring-primary/10">
                          <img 
                            src="/imstev-logo.jpeg" 
                            alt="IMSTEV NATURALS" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-lg font-display font-bold text-primary">IMSTEV NATURALS</span>
                          <span className="text-[9px] font-medium text-primary/70 -mt-0.5 tracking-wider">Home of Nature's Beauty</span>
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
                        {!isHomePage && (
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-12 rounded-xl border-slate-200 dark:border-slate-700"
                            onClick={() => {
                              navigate("/profile");
                              setIsOpen(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span>My Profile</span>
                          </Button>
                        )}
                        {isHomePage && (
                          <Button
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl"
                            onClick={() => {
                              navigate("/scan");
                              setIsOpen(false);
                            }}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Start Scan
                          </Button>
                        )}
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
                          className="w-full h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl"
                          onClick={() => {
                            navigate("/scan");
                            setIsOpen(false);
                          }}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Scan
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
      <div className="h-16 sm:h-[72px]" />
      {!isHomePage && <CompactBeautyShowcaseCarousel />}
    </>
  );
}
