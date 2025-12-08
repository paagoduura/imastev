import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Scan, Sparkles } from "lucide-react";

interface AnalysisTypeSelectorProps {
  value: 'skin' | 'hair';
  onChange: (value: 'skin' | 'hair') => void;
}

export function AnalysisTypeSelector({ value, onChange }: AnalysisTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          What would you like to analyze?
        </h2>
        <p className="text-muted-foreground">
          Choose the type of analysis for accurate AI-powered assessment
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden",
            value === 'skin' 
              ? "border-2 border-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/10 to-primary/5" 
              : "border-2 border-transparent hover:border-primary/50"
          )}
          onClick={() => onChange('skin')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center transition-all",
                value === 'skin' 
                  ? "bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg" 
                  : "bg-gradient-to-br from-rose-500/20 to-orange-500/20 group-hover:from-rose-500/40 group-hover:to-orange-500/40"
              )}>
                <Scan className={cn(
                  "w-10 h-10 transition-colors",
                  value === 'skin' ? "text-white" : "text-rose-500"
                )} />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Skin Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze skin conditions, acne, pigmentation, aging signs, and get personalized skincare recommendations
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Acne', 'Eczema', 'Hyperpigmentation', 'Aging'].map((tag) => (
                  <span 
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-rose-500/10 text-rose-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden",
            value === 'hair' 
              ? "border-2 border-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/10 to-primary/5" 
              : "border-2 border-transparent hover:border-primary/50"
          )}
          onClick={() => onChange('hair')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center transition-all",
                value === 'hair' 
                  ? "bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg" 
                  : "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 group-hover:from-amber-500/40 group-hover:to-yellow-500/40"
              )}>
                <Sparkles className={cn(
                  "w-10 h-10 transition-colors",
                  value === 'hair' ? "text-white" : "text-amber-500"
                )} />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Hair Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze hair texture, porosity, scalp health, and get personalized hair care recommendations for Nigerian hair
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['4A-4C', 'Relaxed', 'Natural', 'Scalp Health'].map((tag) => (
                  <span 
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-amber-500/10 text-amber-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}