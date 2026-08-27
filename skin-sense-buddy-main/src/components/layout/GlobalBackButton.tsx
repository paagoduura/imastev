import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const HIDDEN_PATHS = new Set(["/"]);

function getFallbackPath(pathname: string) {
  if (pathname.startsWith("/results/")) return "/dashboard";
  if (pathname === "/cart") return "/shop";
  if (pathname === "/orders") return "/dashboard";
  if (pathname === "/payment" || pathname === "/payment-callback") return "/dashboard";
  if (pathname === "/forgot-password" || pathname === "/reset-password") return "/auth";
  if (pathname === "/admin") return "/admin/login";
  return "/";
}

export function GlobalBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_PATHS.has(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    // BrowserRouter stores its in-app history position in history.state.idx.
    // Only go back when a prior in-app entry exists; otherwise use a safe
    // route fallback so a direct page visit never exits the IMSTEV website.
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(getFallbackPath(location.pathname), { replace: true });
  };

  return (
    <div className="fixed left-2 top-16 z-40 sm:left-4 sm:top-20">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleBack}
        className="h-8 rounded-full border border-border/70 bg-background/95 px-3 text-xs shadow-md backdrop-blur sm:h-9 sm:text-sm"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>
    </div>
  );
}
