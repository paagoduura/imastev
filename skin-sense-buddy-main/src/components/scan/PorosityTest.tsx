import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Droplets, Timer, CheckCircle2, ArrowRight, Info } from "lucide-react";

interface PorosityResult {
  level: 'low' | 'normal' | 'high';
  description: string;
  characteristics: string[];
  careRecommendations: string[];
}

const POROSITY_RESULTS: Record<string, PorosityResult> = {
  low: {
    level: 'low',
    description: 'Your hair has tightly closed cuticles that resist moisture absorption.',
    characteristics: [
      'Takes a long time to get wet and dry',
      'Products tend to sit on hair rather than absorb',
      'Hair is often resistant to chemical treatments',
      'May feel rough or straw-like when dry',
      'Hair floats on water for extended periods'
    ],
    careRecommendations: [
      'Use heat (steam, warm water) to open cuticles',
      'Apply products to damp, warm hair',
      'Use lightweight, liquid-based products',
      'Clarify regularly to prevent buildup',
      'Deep condition with heat for better absorption'
    ]
  },
  normal: {
    level: 'normal',
    description: 'Your hair has well-balanced cuticles that absorb and retain moisture effectively.',
    characteristics: [
      'Absorbs and holds moisture well',
      'Holds styles well',
      'Accepts chemical treatments predictably',
      'Hair sinks slowly in water (1-4 minutes)',
      'Generally manageable and healthy-looking'
    ],
    careRecommendations: [
      'Maintain current routine with balanced products',
      'Deep condition weekly',
      'Use protein treatments monthly',
      'Protect from heat and sun damage',
      'Continue with LOC/LCO method'
    ]
  },
  high: {
    level: 'high',
    description: 'Your hair has open or damaged cuticles that quickly absorb but struggle to retain moisture.',
    characteristics: [
      'Gets wet and dries very quickly',
      'Absorbs products immediately',
      'Prone to frizz and tangles',
      'May feel dry despite regular conditioning',
      'Hair sinks immediately in water'
    ],
    careRecommendations: [
      'Use heavier creams and butters to seal moisture',
      'Apply leave-in conditioners generously',
      'Use protein treatments to strengthen cuticles',
      'Finish with oils to seal (LOC method)',
      'Avoid excessive heat and chemical processing',
      'Consider apple cider vinegar rinses to close cuticles'
    ]
  }
};

interface Props {
  onComplete: (result: PorosityResult) => void;
  onSkip: () => void;
}

export const PorosityTest = ({ onComplete, onSkip }: Props) => {
  const [step, setStep] = useState<'intro' | 'test' | 'timing' | 'result'>('intro');
  const [testType, setTestType] = useState<'float' | 'spray' | 'slide'>('float');
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [result, setResult] = useState<PorosityResult | null>(null);

  const startTimer = () => {
    setTimerRunning(true);
    setTimer(0);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev >= 240) {
          clearInterval(interval);
          setTimerRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = (sinkTime: 'immediate' | 'slow' | 'float') => {
    setTimerRunning(false);
    let porosityLevel: 'low' | 'normal' | 'high';
    
    if (sinkTime === 'immediate' || timer < 60) {
      porosityLevel = 'high';
    } else if (sinkTime === 'float' || timer > 180) {
      porosityLevel = 'low';
    } else {
      porosityLevel = 'normal';
    }
    
    const porosityResult = POROSITY_RESULTS[porosityLevel];
    setResult(porosityResult);
    setStep('result');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderIntro = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          Hair Porosity Test
        </CardTitle>
        <CardDescription>
          Understanding your hair's porosity helps you choose the right products and techniques
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <button
            onClick={() => { setTestType('float'); setStep('test'); }}
            className="p-4 rounded-lg border-2 border-primary/20 hover:border-primary/50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold">Float Test (Recommended)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop clean, shed hair in water and observe how quickly it sinks
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setTestType('spray'); setStep('test'); }}
            className="p-4 rounded-lg border-2 border-muted hover:border-primary/30 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-semibold">Spray Test</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Spray water on a section of hair and observe absorption
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setTestType('slide'); setStep('test'); }}
            className="p-4 rounded-lg border-2 border-muted hover:border-primary/30 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold">Slide Test</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Slide fingers up a hair strand to feel the cuticle texture
                </p>
              </div>
            </div>
          </button>
        </div>

        <Button variant="ghost" onClick={onSkip} className="w-full">
          Skip Porosity Test
        </Button>
      </CardContent>
    </Card>
  );

  const renderFloatTest = () => (
    <Card>
      <CardHeader>
        <CardTitle>Float Test Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">1</Badge>
            <p className="text-sm">Wash a small section of hair with clarifying shampoo and let it dry completely (no products)</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">2</Badge>
            <p className="text-sm">Collect a few strands of shed hair from your comb or brush</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">3</Badge>
            <p className="text-sm">Fill a clear glass with room temperature water</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">4</Badge>
            <p className="text-sm">Gently drop the hair strands on the water surface</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">5</Badge>
            <p className="text-sm">Wait and observe for 2-4 minutes</p>
          </div>
        </div>

        <Button onClick={() => setStep('timing')} className="w-full">
          <Timer className="mr-2 h-4 w-4" />
          Start Test Timer
        </Button>
      </CardContent>
    </Card>
  );

  const renderSprayTest = () => (
    <Card>
      <CardHeader>
        <CardTitle>Spray Test Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">1</Badge>
            <p className="text-sm">Start with clean, product-free, dry hair</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">2</Badge>
            <p className="text-sm">Fill a spray bottle with plain water</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">3</Badge>
            <p className="text-sm">Spray a section of your hair with water</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">4</Badge>
            <p className="text-sm">Observe how quickly the water absorbs or beads up</p>
          </div>
        </div>

        <div className="grid gap-2 pt-4">
          <p className="text-sm font-medium">What happened?</p>
          <Button onClick={() => stopTimer('immediate')} variant="outline" className="justify-start">
            Water absorbed immediately
          </Button>
          <Button onClick={() => stopTimer('slow')} variant="outline" className="justify-start">
            Water absorbed slowly
          </Button>
          <Button onClick={() => stopTimer('float')} variant="outline" className="justify-start">
            Water beaded up and didn't absorb
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSlideTest = () => (
    <Card>
      <CardHeader>
        <CardTitle>Slide Test Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">1</Badge>
            <p className="text-sm">Take a single strand of clean, dry hair</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">2</Badge>
            <p className="text-sm">Hold it between your thumb and index finger at the tip</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">3</Badge>
            <p className="text-sm">Slide your fingers up towards the root</p>
          </div>
          <div className="flex gap-3 items-start">
            <Badge variant="outline" className="shrink-0">4</Badge>
            <p className="text-sm">Feel the texture as you slide</p>
          </div>
        </div>

        <div className="grid gap-2 pt-4">
          <p className="text-sm font-medium">How did it feel?</p>
          <Button onClick={() => stopTimer('float')} variant="outline" className="justify-start">
            Smooth with little resistance (Low Porosity)
          </Button>
          <Button onClick={() => stopTimer('slow')} variant="outline" className="justify-start">
            Slightly rough with some bumps (Normal Porosity)
          </Button>
          <Button onClick={() => stopTimer('immediate')} variant="outline" className="justify-start">
            Very rough, bumpy, or catching (High Porosity)
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTiming = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5" />
          Float Test Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-mono font-bold text-primary mb-4">
            {formatTime(timer)}
          </div>
          {!timerRunning && timer === 0 && (
            <Button onClick={startTimer} size="lg">
              Start Timer
            </Button>
          )}
        </div>

        {timerRunning && (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Click when your hair sinks or after 4 minutes
            </p>
          </div>
        )}

        <div className="grid gap-2">
          <p className="text-sm font-medium">What's happening to your hair?</p>
          <Button 
            onClick={() => stopTimer('immediate')} 
            variant="outline" 
            className="justify-start"
            disabled={!timerRunning && timer === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-red-500" />
            Hair sank immediately (within 1 minute)
          </Button>
          <Button 
            onClick={() => stopTimer('slow')} 
            variant="outline" 
            className="justify-start"
            disabled={!timerRunning && timer === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Hair sank slowly (1-4 minutes)
          </Button>
          <Button 
            onClick={() => stopTimer('float')} 
            variant="outline" 
            className="justify-start"
            disabled={!timerRunning && timer === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" />
            Hair is still floating (after 4 minutes)
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderResult = () => {
    if (!result) return null;

    const levelColors = {
      low: 'text-blue-600 bg-blue-100',
      normal: 'text-green-600 bg-green-100',
      high: 'text-amber-600 bg-amber-100'
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Your Porosity Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge className={`text-lg px-4 py-2 ${levelColors[result.level]}`}>
              {result.level.toUpperCase()} POROSITY
            </Badge>
            <p className="mt-4 text-muted-foreground">
              {result.description}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Characteristics</h4>
            <ul className="space-y-1">
              {result.characteristics.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Care Recommendations</h4>
            <ul className="space-y-1">
              {result.careRecommendations.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={() => onComplete(result)} className="w-full">
            Continue with Scan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      {step === 'intro' && renderIntro()}
      {step === 'test' && testType === 'float' && renderFloatTest()}
      {step === 'test' && testType === 'spray' && renderSprayTest()}
      {step === 'test' && testType === 'slide' && renderSlideTest()}
      {step === 'timing' && renderTiming()}
      {step === 'result' && renderResult()}
    </div>
  );
};
