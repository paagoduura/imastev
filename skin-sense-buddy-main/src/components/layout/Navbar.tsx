import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Camera,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  TrendingUp,
  User,
  Users,
  Video,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { CompactHeroShowcaseCarousel } from "@/components/layout/HeroShowcaseCarousel";

type NavLinkItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const defaultNavLinks: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/scan", icon: Camera },
  { label: "Timeline", href: "/timeline", icon: TrendingUp },
  { label: "Community", href: "/community", icon: Users },
  { label: "Salon", href: "/salon-booking", icon: Video },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
];

const homeNavLinks: NavLinkItem[] = [
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderNavLink = (link: NavLinkItem, mobile = false) => {
    const isActive = location.pathname === link.href;
    const Icon = link.icon;

    return (
      <button
        key={link.href}
        type="button"
        onClick={() => {
          navigate(link.href);
          if (mobile) setIsOpen(false);
        }}
        className={[
          "relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-medium transition-all duration-300 no-tap-highlight",
          mobile ? "w-full justify-start text-base" : "text-sm",
          isActive
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "text-slate-600 dark:text-slate-300",
        ].join(" ")}
      >
        <Icon className={`h-4 w-4 ${isActive ? "text-white" : ""}`} />
        <span>{link.label}</span>
      </button>
    );
  };

  return (
    <>
      <nav
        className={[
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
          scrolled ? "glass-nav shadow-lg shadow-slate-900/5" : "bg-transparent",
        ].join(" ")}
      >
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3 sm:h-[72px]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="group flex min-w-0 items-center gap-2 no-tap-highlight"
            >
              <div className="relative">
                <div className="h-9 w-9 overflow-hidden rounded-full shadow-lg shadow-primary/10 ring-2 ring-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/20 sm:h-11 sm:w-11">
                  <img
                    src="/imstev-logo.jpeg"
                    alt="IMSTEV NATURALS"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20" />
              </div>

              <div className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-bold text-primary sm:text-lg">
                  IMSTEV NATURALS
                </span>
                <span className="hidden text-[9px] font-medium tracking-wider text-primary/70 sm:block">
                  Home of Nature&apos;s Beauty
                </span>
              </div>
            </button>

            <div className="hidden items-center gap-1 rounded-2xl border border-primary/10 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm lg:flex">
              {navLinks.map((link) => renderNavLink(link))}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              {user ? (
                <>
                  {!isHomePage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/profile")}
                      className="gap-2 text-slate-600 dark:text-slate-300"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span>Profile</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate("/scan")}
                      className="gap-2 bg-primary px-5 text-white shadow-lg shadow-primary/20"
                    >
                      <Camera className="h-4 w-4" />
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
                    className="text-slate-600 dark:text-slate-300"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/scan")}
                    className="gap-2 bg-primary px-5 text-white shadow-lg shadow-primary/20"
                  >
                    <Camera className="h-4 w-4" />
                    Start Scan
                  </Button>
                </>
              )}
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu
                  className={`h-5 w-5 transition-all duration-300 ${
                    isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                  }`}
                />
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-full border-l-0 bg-white p-0 dark:bg-slate-900 sm:w-[320px]"
              >
                <div className="flex h-full flex-col">
                  <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 overflow-hidden rounded-full shadow-lg shadow-primary/10 ring-2 ring-primary/10">
                        <img
                          src="/imstev-logo.jpeg"
                          alt="IMSTEV NATURALS"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-primary">
                          IMSTEV NATURALS
                        </span>
                        <span className="text-[9px] font-medium tracking-wider text-primary/70">
                          Home of Nature&apos;s Beauty
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
                    {navLinks.map((link) => renderNavLink(link, true))}
                  </div>

                  <div className="safe-bottom space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
                    {user ? (
                      <>
                        {!isHomePage ? (
                          <Button
                            variant="outline"
                            className="h-12 w-full justify-start gap-3 rounded-xl border-slate-200 dark:border-slate-700"
                            onClick={() => {
                              navigate("/profile");
                              setIsOpen(false);
                            }}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <span>My Profile</span>
                          </Button>
                        ) : (
                          <Button
                            className="h-12 w-full rounded-xl bg-primary text-white shadow-lg shadow-primary/20"
                            onClick={() => {
                              navigate("/scan");
                              setIsOpen(false);
                            }}
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Start Scan
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          className="h-12 w-full justify-start gap-3 text-slate-500 dark:text-slate-400"
                          onClick={() => {
                            handleSignOut();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="h-12 w-full rounded-xl border-slate-200 font-medium dark:border-slate-700"
                          onClick={() => {
                            navigate("/auth");
                            setIsOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                        <Button
                          className="h-12 w-full rounded-xl bg-primary text-white shadow-lg shadow-primary/20"
                          onClick={() => {
                            navigate("/scan");
                            setIsOpen(false);
                          }}
                        >
                          <Camera className="mr-2 h-4 w-4" />
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
      {!isHomePage && <CompactHeroShowcaseCarousel />}
    </>
  );
}
