import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const HIDDEN_PATHS = new Set(["/"]);

export function GlobalBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_PATHS.has(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="fixed left-3 top-20 z-40 sm:left-4">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleBack}
        className="h-9 rounded-full border border-border/70 bg-background/95 px-3 shadow-md backdrop-blur"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>
    </div>
  );
}

