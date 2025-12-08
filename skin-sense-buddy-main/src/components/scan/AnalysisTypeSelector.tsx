import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Scan, Sparkles, CheckCircle2 } from "lucide-react";

interface AnalysisTypeSelectorProps {
  value: 'skin' | 'hair';
  onChange: (value: 'skin' | 'hair') => void;
}

export function AnalysisTypeSelector({ value, onChange }: AnalysisTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-gradient-premium">
          What would you like to analyze?
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose the type of analysis for accurate AI-powered assessment
        </p>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-300 group relative overflow-hidden rounded-2xl no-tap-highlight",
            value === 'skin' 
              ? "ring-2 ring-rose-500 shadow-xl shadow-rose-500/20 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30" 
              : "border-2 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-lg"
          )}
          onClick={() => onChange('skin')}
        >
          {value === 'skin' && (
            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center z-10">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 sm:p-8 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                value === 'skin' 
                  ? "bg-gradient-to-br from-rose-500 to-orange-500 shadow-xl shadow-rose-500/30" 
                  : "bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30"
              )}>
                <Scan className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 transition-colors",
                  value === 'skin' ? "text-white" : "text-rose-500"
                )} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-display font-semibold mb-2">Skin Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Analyze skin conditions, acne, pigmentation, aging signs, and get personalized skincare recommendations
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Acne', 'Eczema', 'Hyperpigmentation', 'Aging'].map((tag) => (
                  <span 
                    key={tag}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
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
            "cursor-pointer transition-all duration-300 group relative overflow-hidden rounded-2xl no-tap-highlight",
            value === 'hair' 
              ? "ring-2 ring-amber-500 shadow-xl shadow-amber-500/20 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" 
              : "border-2 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg"
          )}
          onClick={() => onChange('hair')}
        >
          {value === 'hair' && (
            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center z-10">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 sm:p-8 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                value === 'hair' 
                  ? "bg-gradient-to-br from-amber-500 to-yellow-500 shadow-xl shadow-amber-500/30" 
                  : "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30"
              )}>
                <Sparkles className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 transition-colors",
                  value === 'hair' ? "text-white" : "text-amber-500"
                )} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-display font-semibold mb-2">Hair Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Analyze hair texture, porosity, scalp health, and get personalized hair care for Nigerian hair
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['4A-4C', 'Relaxed', 'Natural', 'Scalp Health'].map((tag) => (
                  <span 
                    key={tag}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
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
