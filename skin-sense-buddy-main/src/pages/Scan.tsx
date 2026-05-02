import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, AlertCircle, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Video } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { preprocessImage } from "@/lib/imagePreprocessing";
import { ImageQualityIndicator } from "@/components/scan/ImageQualityIndicator";
import { MultiAngleCapture } from "@/components/scan/MultiAngleCapture";
import { AnalysisTypeSelector } from "@/components/scan/AnalysisTypeSelector";
import { HairCaptureGuidelines, HAIR_REQUIRED_ANGLES, HAIR_OPTIONAL_ANGLES, HAIR_ANGLE_DESCRIPTIONS } from "@/components/scan/HairCaptureGuidelines";
import { LiveCameraCapture } from "@/components/scan/LiveCameraCapture";
import { PorosityTest } from "@/components/scan/PorosityTest";
import { QuicktellerCheckout } from "@/components/checkout/QuicktellerCheckout";
import { PaymentOptionsModal } from "@/components/checkout/PaymentOptionsModal";
import { buildApiUrl } from "@/lib/config";
import { MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN, ONE_TIME_ANALYSIS_FEE_NGN } from "@/lib/scanPayments";

type CaptureQuality = {
  blurScore: number;
  lightingScore: number;
  contrastScore: number;
  exposureScore: number;
  isAcceptable: boolean;
  issues: string[];
  recommendations: string[];
};

type PorosityResult = {
  level: string;
};

type ScanRecord = {
  id: string;
  scan_type: "skin" | "hair";
  image_url: string;
  multi_angle_urls?: Record<string, string> | null;
  capture_info?: {
    image_urls?: Record<string, string>;
  } | null;
};

type SubscriptionRecord = {
  status?: string;
  scans_used_this_period?: number | null;
  subscription_plans?: {
    max_scans_per_month?: number | null;
  } | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : null;
    const maybeError = "error" in error ? error.error : null;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
    if (typeof maybeError === "string" && maybeError.trim()) return maybeError;
  }
  return "Something went wrong";
};

interface CapturedAngle {
  angle: string;
  dataUrl: string;
  blob: Blob;
  quality: CaptureQuality;
  metadata: Record<string, unknown>;
}

const SKIN_REQUIRED_ANGLES = ['front', 'close'];
const SKIN_OPTIONAL_ANGLES = ['left', 'right'];
const MONTHLY_SUBSCRIPTION_FEE_NGN = MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN;

const Scan = () => {
  const [authChecking, setAuthChecking] = useState(true);
  const [step, setStep] = useState<'type' | 'porosity' | 'capture' | 'review' | 'analyze'>('type');
  const [analysisType, setAnalysisType] = useState<'skin' | 'hair'>('skin');
  const [currentAngle, setCurrentAngle] = useState<string>('front');
  const [captures, setCaptures] = useState<CapturedAngle[]>([]);
  const [processing, setProcessing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [porosityResult, setPorosityResult] = useState<PorosityResult | null>(null);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<"one-time" | "subscription" | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const [paymentContext, setPaymentContext] = useState<{
    paymentType: "analysis" | "subscription";
    planId?: string;
    scanId?: string;
  } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const ensureAuthenticated = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in or create an account to start a scan.",
        });
        navigate('/auth');
        return;
      }

      setAuthChecking(false);
    };

    ensureAuthenticated();

    return () => {
      mounted = false;
    };
  }, [navigate, toast]);

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

  const handlePorosityComplete = (result: PorosityResult) => {
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
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
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

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);

  const getApiAuthToken = async () => {
    const legacyToken = localStorage.getItem('glowsense_token');
    if (legacyToken) return legacyToken;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const blobToBase64 = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  };

  const uploadCaptureWithFallback = async (
    capture: CapturedAngle,
    userId: string,
    storageBucket: 'hair-scans' | 'skin-scans',
    token: string | null,
  ) => {
    const fileName = `${userId}/${Date.now()}_${capture.angle}.jpg`;
    const uploadErrors: string[] = [];
    const base64Payload = await blobToBase64(capture.blob);

    // Primary path: backend upload endpoint (bypasses strict client-side storage RLS differences).
    let shouldTryDirectStorageFallback = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const uploadResponse = await fetch(buildApiUrl('/storage/upload-scan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bucket: storageBucket,
          fileName,
          contentType: 'image/jpeg',
          base64: base64Payload,
        }),
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (uploadResponse.ok && uploadPayload?.publicUrl) {
        return {
          angle: capture.angle,
          url: String(uploadPayload.publicUrl),
          quality: capture.quality,
        };
      }

      const backendError = uploadPayload?.error || uploadResponse.statusText || 'Upload endpoint error';
      uploadErrors.push(`backend attempt ${attempt}: ${backendError}`);
      if (uploadResponse.status === 404 || String(backendError).toLowerCase().includes('not found')) {
        shouldTryDirectStorageFallback = true;
        break;
      }
    }

    // Secondary path: direct Supabase storage upload (works in environments where auth + RLS are aligned).
    if (shouldTryDirectStorageFallback || uploadErrors.length > 0) {
      const { error } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, capture.blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(fileName);
        return {
          angle: capture.angle,
          url: publicUrl,
          quality: capture.quality,
        };
      }

      uploadErrors.push(`direct storage fallback: ${error.message}`);
    }

    throw new Error(`${capture.angle}: ${uploadErrors.join(' | ')}`);
  };

  const getActiveSubscription = async (): Promise<SubscriptionRecord | null> => {
    const token = await getApiAuthToken();
    if (!token) return null;

    const response = await fetch(buildApiUrl('/subscriptions'), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as SubscriptionRecord;
    if (!data || data.status !== 'active') return null;
    return data;
  };

  const consumeSubscriptionScan = async () => {
    const token = await getApiAuthToken();
    if (!token) throw new Error('Missing auth token');

    const response = await fetch(buildApiUrl('/subscriptions/consume-scan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Unable to consume subscription scan');
    }
    return payload;
  };

  const runAnalysis = async (scan: ScanRecord) => {
    const imageUrls = scan.capture_info?.image_urls || scan.multi_angle_urls || {};
    const primaryAngle = scan.scan_type === 'hair' ? 'scalp_parting' : 'close';
    const functionName = scan.scan_type === 'hair' ? 'analyze-hair' : 'analyze-skin';

    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(functionName, {
      body: {
        scanId: scan.id,
        imageUrl: imageUrls[primaryAngle] || scan.image_url,
        multiAngleUrls: imageUrls,
      },
    });

    if (analysisError || !analysisData?.success) {
      throw new Error(analysisError?.message || analysisData?.error || 'Analysis failed');
    }
  };

  const prepareScan = async (user: { id: string }) => {
    try {
      const token = await getApiAuthToken();
      await fetch(buildApiUrl('/storage/ensure-buckets'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (error) {
      console.warn('Unable to auto-create storage buckets:', error);
    }

    const storageBucket = analysisType === 'hair' ? 'hair-scans' : 'skin-scans';
    const token = await getApiAuthToken();
    const uploadResults = await Promise.allSettled(captures.map((capture) =>
      uploadCaptureWithFallback(capture, user.id, storageBucket, token)
    ));

    const failedUploads = uploadResults.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failedUploads.length > 0) {
      const failedAngles = failedUploads
        .map((failure) => (failure.reason instanceof Error ? failure.reason.message : 'Unknown error'))
        .join(', ');
      throw new Error(`Some images failed to upload: ${failedAngles}`);
    }

    const uploadedImages = uploadResults
      .filter((r): r is PromiseFulfilledResult<{ angle: string; url: string; quality: CaptureQuality }> => r.status === 'fulfilled')
      .map(r => r.value);

    const frontAngle = analysisType === 'hair' ? 'crown' : 'front';
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        image_url: uploadedImages.find(i => i.angle === frontAngle)?.url || uploadedImages[0].url,
        scan_type: analysisType,
        status: 'pending',
        multi_angle_urls: uploadedImages.reduce((acc, img) => ({
          ...acc,
          [img.angle]: img.url
        }), {}),
        calibration_data: {
          angles: uploadedImages.map(i => i.angle),
          quality_scores: uploadedImages.map(i => ({
            angle: i.angle,
            blur: i.quality.blurScore,
            lighting: i.quality.lightingScore,
            contrast: i.quality.contrastScore
          })),
        },
        porosity_test_result: porosityResult
      })
      .select()
      .single();

    if (scanError) throw scanError;
    return { scan, uploadedImages };
  };

  const handlePayAndAnalyze = async () => {
    if (paymentLoading) return;
    
    try {
      setPaymentLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to analyze images",
          variant: "destructive",
        });
        navigate('/auth');
        setPaymentLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.phone) {
        toast({
          title: "Phone number required",
          description: "Please add your phone number in your profile before making a payment.",
          variant: "destructive",
        });
        navigate('/profile');
        setPaymentLoading(false);
        return;
      }

      // If user has an active scan subscription with remaining quota, skip payment and run analysis now.
      const activeSubscription = await getActiveSubscription();
      const rawMaxScans = activeSubscription?.subscription_plans?.max_scans_per_month;
      const maxScans = rawMaxScans === null || rawMaxScans === undefined ? null : Number(rawMaxScans);
      const scansUsed = Number(activeSubscription?.scans_used_this_period ?? 0);
      const hasRemainingSubscriptionScans =
        !!activeSubscription &&
        (maxScans === null || (maxScans > 0 && scansUsed < maxScans));

      if (hasRemainingSubscriptionScans) {
        const { scan } = await prepareScan(user);
        await consumeSubscriptionScan();
        await runAnalysis(scan);

        toast({
          title: "Analysis Complete",
          description: "Your scan was processed using your active monthly subscription.",
        });
        navigate(`/results/${scan.id}`);
        setPaymentLoading(false);
        return;
      }

      // Show payment options modal first
      setShowPaymentOptionsModal(true);
      setPaymentLoading(false);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setPaymentLoading(false);
    }
  };

  const handlePaymentOptionSelect = async (option: "one-time" | "subscription") => {
    setSelectedPaymentOption(option);
    setShowPaymentOptionsModal(false);
    setPaymentLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User information missing");

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.phone) throw new Error("Phone number not found");

      let formattedPhone = profileData.phone;
      if (formattedPhone.startsWith('234')) {
        formattedPhone = '0' + formattedPhone.slice(3);
      }

      // Determine payment details based on selected option
      const amount = option === 'one-time' ? ONE_TIME_ANALYSIS_FEE_NGN : MONTHLY_SUBSCRIPTION_FEE_NGN;
      const paymentType = option === 'one-time' ? 'analysis' : 'subscription';
      const { scan } = await prepareScan(user);

      // Store payment details and show payment modal
      setPaymentDetails({
        amount,
        customerEmail: user.email!,
        customerName: profileData?.full_name || user.email?.split('@')[0] || 'IMSTEV User',
        customerPhone: formattedPhone,
      });

      setPaymentContext({
        paymentType,
        scanId: scan.id,
      });

      // Keep scan/payment context available even if checkout redirects away from this page.
      sessionStorage.setItem('pendingPaymentType', paymentType);
      sessionStorage.setItem('pendingAnalysisScanId', scan.id);
      sessionStorage.setItem('paymentOption', option);
      if (paymentType === 'subscription') {
        sessionStorage.setItem('pendingSubscriptionPlanId', 'monthly-scan-plan');
      } else {
        sessionStorage.removeItem('pendingSubscriptionPlanId');
      }
      
      setShowPaymentModal(true);
      setPaymentLoading(false);

    } catch (error) {
      console.error('Payment option error:', error);
      toast({
        title: "Payment Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setPaymentLoading(false);
      setSelectedPaymentOption(null);
      setPaymentContext(null);
    }
  };

  const handlePaymentSuccess = async (transactionRef: string) => {
    try {
      setShowPaymentModal(false);

      toast({
        title: "Payment Successful",
        description: "Preparing your scan and continuing analysis...",
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found. Please sign in and try again.");
      const scanId = paymentContext?.scanId;
      const pendingType = paymentContext?.paymentType || (selectedPaymentOption === 'subscription' ? 'subscription' : 'analysis');
      if (!scanId) {
        throw new Error("Scan information missing. Please try payment again.");
      }

      sessionStorage.setItem('pendingPaymentType', pendingType);
      sessionStorage.setItem('pendingAnalysisScanId', scanId);
      sessionStorage.setItem('paymentOption', selectedPaymentOption || 'one-time');
      sessionStorage.setItem('paymentTransactionRef', transactionRef);
      navigate(`/payment-callback?txnref=${encodeURIComponent(transactionRef)}`);

      setSelectedPaymentOption(null);
      setPaymentContext(null);
    } catch (error) {
      console.error('Error processing payment and images:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setShowPaymentModal(false);
      setSelectedPaymentOption(null);
      setPaymentContext(null);
    }
  };

  const stepLabels: Record<string, string> = {
    type: 'Select the type of analysis you need',
    porosity: 'Test your hair porosity for personalized recommendations',
    capture: 'Capture high-quality images for accurate AI analysis',
    review: 'Review your images before analysis',
    analyze: 'Ready to analyze your images'
  };

  const steps = analysisType === 'hair' 
    ? ['type', 'porosity', 'capture', 'review', 'analyze'] 
    : ['type', 'capture', 'review', 'analyze'];

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
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
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
              onClick={() => cameraInputRef.current?.click()}
              disabled={processing}
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => uploadInputRef.current?.click()}
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
          onClick={() => setStep('analyze')}
          className="flex-1"
        >
          Continue to Analysis
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderAnalyzeStep = () => (
    <div className="space-y-6">
      <Card className="border-success bg-success/5">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready for {analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis</h3>
            <p className="text-muted-foreground">
              {captures.length} image{captures.length > 1 ? 's' : ''} captured
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
          onClick={() => setStep('review')}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={handlePayAndAnalyze}
          disabled={paymentLoading}
          className="flex-1 bg-gradient-to-r from-primary to-primary/80"
        >
          {paymentLoading ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-spin" />
              Starting payment...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Continue to Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (authChecking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="gradient-mesh min-h-screen">
        <div className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-6 sm:py-8 transition-all ${showPaymentModal ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="mb-6 sm:mb-8 flex items-center justify-between">
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
                    ? 'w-10 sm:w-12 bg-gradient-to-r from-purple-600 to-amber-500'
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
            {step === 'review' && !showPaymentModal && renderReviewStep()}
            {step === 'analyze' && renderAnalyzeStep()}
          </div>
        </div>
      </div>

      {/* Payment Options Modal */}
      <PaymentOptionsModal
        isOpen={showPaymentOptionsModal}
        onClose={() => setShowPaymentOptionsModal(false)}
        onSelect={handlePaymentOptionSelect}
        isLoading={paymentLoading}
        userEmail={''}
      />

      {/* Payment Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 flex justify-between items-center">
              <h2 className="text-lg font-bold">Complete Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <QuicktellerCheckout
                amount={paymentDetails.amount}
                customerName={paymentDetails.customerName}
                customerEmail={paymentDetails.customerEmail}
                customerPhone={paymentDetails.customerPhone}
                description={`${analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis - ${selectedPaymentOption === 'subscription' ? 'Monthly Subscription' : 'Single Scan'}`}
                paymentType={paymentContext?.paymentType || "analysis"}
                planId={paymentContext?.planId}
                scanId={paymentContext?.scanId}
                metadata={
                  selectedPaymentOption
                    ? {
                        source: "scan_flow",
                        paymentOption: selectedPaymentOption,
                        scanId: paymentContext?.scanId,
                      }
                    : { source: "scan_flow", scanId: paymentContext?.scanId }
                }
                onPaymentSuccess={handlePaymentSuccess}
                onDismiss={() => setShowPaymentModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Scan;
