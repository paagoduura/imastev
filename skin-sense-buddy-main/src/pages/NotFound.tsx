import { useLocation, Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center gradient-mesh px-4 sm:px-6">
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse-soft" />
      
      <div className="relative text-center max-w-md mx-auto">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
          <span className="text-3xl sm:text-4xl font-display font-bold text-white">404</span>
        </div>
        <h1 className="mb-3 text-2xl sm:text-3xl font-display font-bold text-foreground">Page Not Found</h1>
        <p className="mb-6 text-base sm:text-lg text-muted-foreground px-4">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button 
            asChild
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white"
          >
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
