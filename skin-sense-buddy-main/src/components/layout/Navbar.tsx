import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, LayoutDashboard, ShoppingBag, TrendingUp, Menu, Sparkles, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/scan", icon: Camera },
  { label: "Timeline", href: "/timeline", icon: TrendingUp },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
          relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
          ${mobile ? "w-full justify-start text-base" : "text-sm"}
          ${isActive 
            ? "bg-primary text-primary-foreground shadow-md" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }
        `}
      >
        <Icon className="w-4 h-4" />
        <span>{link.label}</span>
        {isActive && !mobile && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
      </button>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-primary/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            GlowSense
          </span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-muted/50">
          {navLinks.map((link) => (
            <NavLink key={link.href} link={link} />
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
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
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/scan")}
                className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-md"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Scan
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">GlowSense</span>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex-1 p-4 space-y-2">
                {navLinks.map((link) => (
                  <NavLink key={link.href} link={link} mobile />
                ))}
              </div>

              {/* Mobile Auth */}
              <div className="p-4 border-t border-border space-y-2">
                {user ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        navigate("/profile");
                        setIsOpen(false);
                      }}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-muted-foreground"
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
                      className="w-full"
                      onClick={() => {
                        navigate("/auth");
                        setIsOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-primary-glow"
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
    </nav>
  );
}