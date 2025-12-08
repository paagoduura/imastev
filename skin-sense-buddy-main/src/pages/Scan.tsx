import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, AlertCircle, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Video } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { preprocessImage } from "@/lib/imagePreprocessing";
import { ImageQualityIndicator } from "@/components/scan/ImageQualityIndicator";
import { MultiAngleCapture } from "@/components/scan/MultiAngleCapture";
import { ScaleCalibrationTool } from "@/components/scan/ScaleCalibrationTool";
import { AnalysisTypeSelector } from "@/components/scan/AnalysisTypeSelector";
import { HairCaptureGuidelines, HAIR_REQUIRED_ANGLES, HAIR_OPTIONAL_ANGLES, HAIR_ANGLE_DESCRIPTIONS } from "@/components/scan/HairCaptureGuidelines";
import { LiveCameraCapture } from "@/components/scan/LiveCameraCapture";
import { PorosityTest } from "@/components/scan/PorosityTest";

interface CapturedAngle {
  angle: string;
  dataUrl: string;
  blob: Blob;
  quality: {
    blurScore: number;
    lightingScore: number;
    contrastScore: number;
    exposureScore: number;
    isAcceptable: boolean;
    issues: string[];
    recommendations: string[];
  };
  metadata: any;
}

const SKIN_REQUIRED_ANGLES = ['front', 'close'];
const SKIN_OPTIONAL_ANGLES = ['left', 'right'];

const Scan = () => {
  const [step, setStep] = useState<'type' | 'porosity' | 'capture' | 'review' | 'calibrate' | 'analyze'>('type');
  const [analysisType, setAnalysisType] = useState<'skin' | 'hair'>('skin');
  const [currentAngle, setCurrentAngle] = useState<string>('front');
  const [captures, setCaptures] = useState<CapturedAngle[]>([]);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [calibrationData, setCalibrationData] = useState<{ pixelsPerMM: number; referenceType: string } | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [porosityResult, setPorosityResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get the correct angles based on analysis type
  const REQUIRED_ANGLES = analysisType === 'hair' ? HAIR_REQUIRED_ANGLES : SKIN_REQUIRED_ANGLES;
  const OPTIONAL_ANGLES = analysisType === 'hair' ? HAIR_OPTIONAL_ANGLES : SKIN_OPTIONAL_ANGLES;
  const ALL_ANGLES = [...REQUIRED_ANGLES, ...OPTIONAL_ANGLES];

  const handleAnalysisTypeSelect = (type: 'skin' | 'hair') => {
    setAnalysisType(type);
    setCaptures([]);
    setCurrentAngle(type === 'hair' ? 'crown' : 'front');
  };

  const handleProceedToCapture = () => {
    if (analysisType === 'hair') {
      setStep('porosity');
    } else {
      setStep('capture');
    }
  };

  const handlePorosityComplete = (result: any) => {
    setPorosityResult(result);
    setStep('capture');
    toast({
      title: "Porosity test complete",
      description: `Your hair has ${result.level} porosity`,
    });
  };

  const handlePorositySkip = () => {
    setStep('capture');
  };

  const handleLiveCameraCapture = async (blob: Blob, dataUrl: string) => {
    setShowLiveCamera(false);
    setProcessing(true);

    try {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const preprocessed = await preprocessImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.92,
        applyEnhancements: true
      });

      if (!preprocessed.quality.isAcceptable) {
        toast({
          title: "Image quality issues detected",
          description: "We'll proceed but recommend retaking for best results",
          variant: "default",
        });
      }

      const newCapture: CapturedAngle = {
        angle: currentAngle,
        dataUrl: preprocessed.dataUrl,
        blob: preprocessed.blob,
        quality: preprocessed.quality,
        metadata: preprocessed.metadata
      };

      setCaptures(prev => {
        const filtered = prev.filter(c => c.angle !== currentAngle);
        return [...filtered, newCapture];
      });

      toast({
        title: "Image captured!",
        description: `${currentAngle.replace(/_/g, ' ')} view added successfully`,
      });

      const capturedAngles = [...captures.map(c => c.angle), currentAngle];
      const nextRequired = REQUIRED_ANGLES.find(a => !capturedAngles.includes(a));
      
      if (nextRequired) {
        setCurrentAngle(nextRequired);
      } else {
        setStep('review');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      toast({
        title: "Capture failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const preprocessed = await preprocessImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.92,
        applyEnhancements: true
      });

      if (!preprocessed.quality.isAcceptable) {
        toast({
          title: "Image quality issues detected",
          description: "We'll proceed but recommend retaking for best results",
          variant: "default",
        });
      }

      const newCapture: CapturedAngle = {
        angle: currentAngle,
        dataUrl: preprocessed.dataUrl,
        blob: preprocessed.blob,
        quality: preprocessed.quality,
        metadata: preprocessed.metadata
      };

      setCaptures(prev => {
        const filtered = prev.filter(c => c.angle !== currentAngle);
        return [...filtered, newCapture];
      });

      toast({
        title: "Image captured!",
        description: `${currentAngle} view added successfully`,
      });

      const capturedAngles = [...captures.map(c => c.angle), currentAngle];
      const nextRequired = REQUIRED_ANGLES.find(a => !capturedAngles.includes(a));
      
      if (nextRequired) {
        setCurrentAngle(nextRequired);
      } else {
        setStep('review');
      }

    } catch (error) {
      console.error('Image preprocessing error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCapture = (angle: string) => {
    setCaptures(prev => prev.filter(c => c.angle !== angle));
    toast({
      title: "Capture removed",
      description: `${angle} view has been removed`,
    });
  };

  const handleRetakeCapture = (angle: string) => {
    setCurrentAngle(angle);
    setStep('capture');
  };

  const handleProceedToReview = () => {
    const requiredCaptured = REQUIRED_ANGLES.every(angle => 
      captures.some(c => c.angle === angle)
    );

    if (!requiredCaptured) {
      toast({
        title: "Missing required angles",
        description: "Please capture all required angles before proceeding",
        variant: "destructive",
      });
      return;
    }

    setStep('review');
  };

  const handleCalibrationComplete = (pixelsPerMM: number, referenceType: string) => {
    setCalibrationData({ pixelsPerMM, referenceType });
    toast({
      title: "Calibration complete",
      description: "Scale reference has been set for accurate measurements",
    });
    setStep('analyze');
  };

  const handleSkipCalibration = () => {
    setStep('analyze');
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to analyze images",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Determine the storage bucket based on analysis type
      const storageBucket = analysisType === 'hair' ? 'hair-scans' : 'skin-scans';

      // Upload all captured images with better error handling
      const uploadResults = await Promise.allSettled(captures.map(async (capture) => {
        const fileName = `${user.id}/${Date.now()}_${capture.angle}.jpg`;
        const { data, error } = await supabase.storage
          .from(storageBucket)
          .upload(fileName, capture.blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (error) throw new Error(`Failed to upload ${capture.angle}: ${error.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(fileName);

        return {
          angle: capture.angle,
          url: publicUrl,
          quality: capture.quality
        };
      }));

      // Check for failed uploads
      const failedUploads = uploadResults.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      if (failedUploads.length > 0) {
        const failedAngles = failedUploads.map(f => f.reason?.message || 'Unknown error').join(', ');
        throw new Error(`Some images failed to upload: ${failedAngles}`);
      }

      const uploadedImages = uploadResults
        .filter((r): r is PromiseFulfilledResult<{ angle: string; url: string; quality: any }> => r.status === 'fulfilled')
        .map(r => r.value);

      // Get the primary image (close-up for skin, scalp_parting for hair)
      const primaryAngle = analysisType === 'hair' ? 'scalp_parting' : 'close';
      const frontAngle = analysisType === 'hair' ? 'crown' : 'front';

      // Create scan record with scan_type
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          image_url: uploadedImages.find(i => i.angle === frontAngle)?.url || uploadedImages[0].url,
          body_area: analysisType === 'hair' ? 'scalp' : 'face',
          scan_type: analysisType,
          status: 'pending',
          capture_info: {
            angles: uploadedImages.map(i => i.angle),
            quality_scores: uploadedImages.map(i => ({
              angle: i.angle,
              blur: i.quality.blurScore,
              lighting: i.quality.lightingScore,
              contrast: i.quality.contrastScore
            })),
            calibration: calibrationData,
            image_urls: uploadedImages.reduce((acc, img) => ({
              ...acc,
              [img.angle]: img.url
            }), {})
          }
        })
        .select()
        .single();

      if (scanError) throw scanError;

      toast({
        title: "Images uploaded",
        description: `Starting AI ${analysisType} analysis...`,
      });

      // Get the session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Call the appropriate AI analysis function
      const functionName = analysisType === 'hair' ? 'analyze-hair' : 'analyze-skin';
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(functionName, {
        body: { 
          scanId: scan.id,
          imageUrl: uploadedImages.find(i => i.angle === primaryAngle)?.url || uploadedImages[0].url,
          multiAngleUrls: uploadedImages.reduce((acc, img) => ({
            ...acc,
            [img.angle]: img.url
          }), {}),
          calibration: calibrationData
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (analysisError) throw analysisError;

      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      toast({
        title: "Analysis complete!",
        description: "Redirecting to results...",
      });

      navigate(`/results/${scan.id}`);

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const stepLabels: Record<string, string> = {
    type: 'Select the type of analysis you need',
    porosity: 'Test your hair porosity for personalized recommendations',
    capture: 'Capture high-quality images for accurate AI analysis',
    review: 'Review your images before analysis',
    calibrate: 'Optional: Calibrate for precise measurements',
    analyze: 'Ready to analyze your images'
  };

  const steps = analysisType === 'hair' 
    ? ['type', 'porosity', 'capture', 'review', 'calibrate', 'analyze'] 
    : ['type', 'capture', 'review', 'calibrate', 'analyze'];

  const renderTypeStep = () => (
    <div className="space-y-6">
      <AnalysisTypeSelector 
        value={analysisType} 
        onChange={handleAnalysisTypeSelect} 
      />
      
      <Button 
        size="lg" 
        className="w-full"
        onClick={handleProceedToCapture}
      >
        Continue with {analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );

  const renderCaptureStep = () => (
    <div className="space-y-6">
      {/* Guidelines */}
      {analysisType === 'hair' ? (
        <HairCaptureGuidelines />
      ) : (
        <Card className="border-primary/20 bg-primary-light/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Capture Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>Use natural daylight or bright indoor lighting</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>Remove makeup from affected area</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>Hold camera steady, ensure sharp focus</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>Avoid shadows and reflections</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Angle selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Angle</CardTitle>
          <CardDescription>
            {REQUIRED_ANGLES.includes(currentAngle) ? '⭐ Required' : 'Optional for better analysis'}
            {analysisType === 'hair' && HAIR_ANGLE_DESCRIPTIONS[currentAngle] && (
              <span className="block mt-1 text-xs">{HAIR_ANGLE_DESCRIPTIONS[currentAngle]}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap mb-4">
            {ALL_ANGLES.map((angle) => (
              <Button
                key={angle}
                variant={currentAngle === angle ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentAngle(angle)}
                disabled={processing}
              >
                {angle.replace(/_/g, ' ')}
                {REQUIRED_ANGLES.includes(angle) && " ⭐"}
                {captures.some(c => c.angle === angle) && (
                  <CheckCircle2 className="w-3 h-3 ml-2 text-success" />
                )}
              </Button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              size="lg"
              onClick={() => setShowLiveCamera(true)}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-5 w-5" />
                  Live Camera
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload
            </Button>
          </div>

          {showLiveCamera && (
            <LiveCameraCapture
              onCapture={handleLiveCameraCapture}
              onClose={() => setShowLiveCamera(false)}
              captureLabel={`Capture ${currentAngle.replace(/_/g, ' ')}`}
            />
          )}
        </CardContent>
      </Card>

      {/* Show captured images */}
      {captures.length > 0 && (
        <>
          <MultiAngleCapture
            requiredAngles={ALL_ANGLES}
            captures={captures}
            onRemove={handleRemoveCapture}
            onRetake={handleRetakeCapture}
          />

          {captures.find(c => c.angle === currentAngle) && (
            <ImageQualityIndicator
              quality={captures.find(c => c.angle === currentAngle)!.quality}
            />
          )}

          <div className="flex gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStep('type')}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Change Type
            </Button>
            <Button
              size="lg"
              onClick={handleProceedToReview}
              className="flex-1"
            >
              Continue to Review
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Captures</CardTitle>
          <CardDescription>
            Ensure all images are clear and properly lit before {analysisType} analysis
          </CardDescription>
        </CardHeader>
      </Card>

      <MultiAngleCapture
        requiredAngles={ALL_ANGLES}
        captures={captures}
        onRemove={handleRemoveCapture}
        onRetake={handleRetakeCapture}
      />

      <div className="flex gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setStep('capture')}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Add More
        </Button>
        <Button
          size="lg"
          onClick={() => setStep('calibrate')}
          className="flex-1"
        >
          Continue to Calibration
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderCalibrateStep = () => {
    const closeImage = analysisType === 'hair' 
      ? captures.find(c => c.angle === 'scalp_parting') || captures.find(c => c.angle === 'strand_closeup')
      : captures.find(c => c.angle === 'close');
    
    return (
      <div className="space-y-6">
        <ScaleCalibrationTool
          imageDataUrl={closeImage?.dataUrl || captures[0]?.dataUrl || ''}
          onCalibrationComplete={handleCalibrationComplete}
        />

        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setStep('review')}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleSkipCalibration}
            className="flex-1"
          >
            Skip Calibration
          </Button>
        </div>
      </div>
    );
  };

  const renderAnalyzeStep = () => (
    <div className="space-y-6">
      <Card className="border-success bg-success/5">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready for {analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis</h3>
            <p className="text-muted-foreground">
              {captures.length} image{captures.length > 1 ? 's' : ''} captured
              {calibrationData && ' • Scale calibrated'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {captures.map((capture) => (
              <span key={capture.angle} className="px-3 py-1 bg-success/10 rounded-full text-sm">
                {capture.angle.replace(/_/g, ' ')} ✓
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setStep('calibrate')}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80"
        >
          {analyzing ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Start AI Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-3 text-gradient-premium">
              {analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              {stepLabels[step]}
            </p>
          </div>

          <div className="flex justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-10">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  steps.indexOf(step) >= i
                    ? 'w-10 sm:w-12 bg-gradient-to-r from-teal-500 to-emerald-500'
                    : 'w-6 sm:w-8 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="animate-fade-in">
            {step === 'type' && renderTypeStep()}
            {step === 'porosity' && (
              <PorosityTest 
                onComplete={handlePorosityComplete}
                onSkip={handlePorositySkip}
              />
            )}
            {step === 'capture' && renderCaptureStep()}
            {step === 'review' && renderReviewStep()}
            {step === 'calibrate' && renderCalibrateStep()}
            {step === 'analyze' && renderAnalyzeStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scan;