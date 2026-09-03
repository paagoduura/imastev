import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, AlertCircle, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Video } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { preprocessImage } from "@/lib/imagePreprocessing";
import { ImageQualityIndicator } from "@/components/scan/ImageQualityIndicator";
import { MultiAngleCapture } from "@/components/scan/MultiAngleCapture";
import { AnalysisTypeSelector } from "@/components/scan/AnalysisTypeSelector";
import { ScannerGuidanceCard } from "@/components/scan/ScannerGuidanceCard";
import { LiveCameraCapture } from "@/components/scan/LiveCameraCapture";
import { PorosityTest } from "@/components/scan/PorosityTest";
import { PaymentOptionsModal } from "@/components/checkout/PaymentOptionsModal";
import { PhoneNumberPrompt } from "@/components/checkout/PhoneNumberPrompt";
import { buildApiUrl, buildFunctionUrl, FUNCTIONS_BASE } from "@/lib/config";
import { getQualityFailureMessage, getScanAngles, getScanQuality, isScanMode, SCAN_MODE_CONFIG, type ScanMode, type ScanQuality } from "@/lib/scanEngine";
import { MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN, ONE_TIME_ANALYSIS_FEE_NGN } from "@/lib/scanPayments";

type CaptureQuality = {
  blurScore: number;
  lightingScore: number;
  contrastScore: number;
  exposureScore: number;
  isAcceptable: boolean;
  issues: string[];
  recommendations: string[];
  scanQuality?: ScanQuality;
};

type PorosityResult = {
  level: string;
};

type ScanRecord = {
  id: string;
  scan_type: ScanMode;
  image_url: string;
  multi_angle_urls?: Record<string, string> | null;
  capture_info?: {
    image_urls?: Record<string, string>;
    scan_mode?: ScanMode;
    required_angles?: string[];
    captured_angles?: string[];
    quality_scores?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  } | null;
};

type SubscriptionRecord = {
  status?: string;
  tier?: string;
  scans_used_this_period?: number | null;
  subscription_plans?: {
    tier?: string;
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
  originalBlob?: Blob;
  quality: CaptureQuality;
  metadata: Record<string, unknown>;
}

const SKIN_REQUIRED_ANGLES = ['front', 'close'];
const SKIN_OPTIONAL_ANGLES = ['left', 'right'];
const MONTHLY_SUBSCRIPTION_FEE_NGN = MONTHLY_SCAN_SUBSCRIPTION_FEE_NGN;

const Scan = () => {
  const [authChecking, setAuthChecking] = useState(true);
  const [step, setStep] = useState<'type' | 'porosity' | 'capture' | 'review' | 'analyze'>('type');
  const [analysisType, setAnalysisType] = useState<ScanMode>('skin');
  const [currentAngle, setCurrentAngle] = useState<string>('front');
  const [captures, setCaptures] = useState<CapturedAngle[]>([]);
  const [processing, setProcessing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [porosityResult, setPorosityResult] = useState<PorosityResult | null>(null);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<"one-time" | "subscription" | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const dedicatedMode = location.pathname === '/hair-scan' ? 'hair' : location.pathname === '/skin-scan' ? 'skin' : null;

  useEffect(() => {
    if (!dedicatedMode) return;
    setAnalysisType(dedicatedMode);
    setStep(dedicatedMode === 'hair' ? 'porosity' : 'capture');
    setCaptures([]);
    setCurrentAngle(getScanAngles(dedicatedMode).required[0]?.id || 'front');
  }, [dedicatedMode]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollingElement = document.scrollingElement ?? root;

    const resetScroll = () => {
      root.scrollTop = 0;
      body.scrollTop = 0;
      scrollingElement.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    resetScroll();
    const rafId = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(rafId);
  }, []);

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

  const angleConfig = getScanAngles(analysisType);
  const REQUIRED_ANGLES = angleConfig.required.map((angle) => angle.id);
  const OPTIONAL_ANGLES = angleConfig.optional.map((angle) => angle.id);
  const ALL_ANGLES = angleConfig.all.map((angle) => angle.id);
  const currentAngleConfig = angleConfig.all.find((angle) => angle.id === currentAngle) || angleConfig.required[0];

  const handleAnalysisTypeSelect = (type: ScanMode) => {
    setAnalysisType(type);
    setCaptures([]);
    setCurrentAngle(getScanAngles(type).required[0]?.id || 'front');
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

      const scanQuality = getScanQuality(preprocessed.width, preprocessed.height, preprocessed.quality, analysisType);
      if (!scanQuality.isAcceptable) {
        toast({
          title: "Retake required for a reliable scan",
          description: `${getQualityFailureMessage(scanQuality)} ${scanQuality.recommendations[0] || ''}`.trim(),
          variant: "destructive",
        });
        return;
      }

      const newCapture: CapturedAngle = {
        angle: currentAngle,
        dataUrl: preprocessed.dataUrl,
        blob: preprocessed.blob,
        originalBlob: blob,
        quality: { ...preprocessed.quality, scanQuality },
        metadata: { ...preprocessed.metadata, width: preprocessed.width, height: preprocessed.height, scanQuality }
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

      const scanQuality = getScanQuality(preprocessed.width, preprocessed.height, preprocessed.quality, analysisType);
      if (!scanQuality.isAcceptable) {
        toast({
          title: "Retake required for a reliable scan",
          description: `${getQualityFailureMessage(scanQuality)} ${scanQuality.recommendations[0] || ''}`.trim(),
          variant: "destructive",
        });
        return;
      }

      const newCapture: CapturedAngle = {
        angle: currentAngle,
        dataUrl: preprocessed.dataUrl,
        blob: preprocessed.blob,
        originalBlob: file,
        quality: { ...preprocessed.quality, scanQuality },
        metadata: { ...preprocessed.metadata, width: preprocessed.width, height: preprocessed.height, scanQuality }
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
    const { data: { session } } = await supabase.auth.getSession();
    const sessionToken = session?.access_token?.trim();
    const legacyToken = localStorage.getItem('glowsense_token')?.trim();
    const token = sessionToken || legacyToken;
    return token?.replace(/^Bearer\s+/i, '').trim() || null;
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
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${capture.angle}.jpg`;
    const originalFileName = `${userId}/original_${timestamp}_${capture.angle}.jpg`;
    const uploadErrors: string[] = [];
    const base64Payload = await blobToBase64(capture.blob);
    let originalUrl: string | undefined;

    if (capture.originalBlob) {
      const originalPayload = await blobToBase64(capture.originalBlob);
      const originalResponse = await fetch(buildApiUrl('/storage/upload-scan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bucket: storageBucket,
          fileName: originalFileName,
          contentType: capture.originalBlob.type || 'image/jpeg',
          base64: originalPayload,
        }),
      });
      const originalResult = await originalResponse.json().catch(() => ({}));
      if (originalResponse.ok && originalResult?.publicUrl) {
        originalUrl = String(originalResult.publicUrl);
      } else {
        const { error: originalUploadError } = await supabase.storage.from(storageBucket).upload(originalFileName, capture.originalBlob, {
          contentType: capture.originalBlob.type || 'image/jpeg',
          upsert: false,
        });
        if (originalUploadError) throw new Error(`${capture.angle}: original image could not be retained`);
        originalUrl = supabase.storage.from(storageBucket).getPublicUrl(originalFileName).data.publicUrl;
      }
    }

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
          metadata: capture.metadata,
          originalUrl,
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
          metadata: capture.metadata,
          originalUrl,
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

  const runAnalysis = async (scan: ScanRecord, preview = false, captureInfo?: Record<string, unknown>, multiAngleUrls?: Record<string, string>) => {
    const token = await getApiAuthToken();
    if (!token) throw new Error('Authentication required to run analysis');

    const scanMode = isScanMode(scan.scan_type) ? scan.scan_type : 'skin';
    const targets = scanMode === 'full' ? ['skin', 'hair'] as const : scanMode === 'scalp' ? ['scalp'] as const : [scanMode] as const;
    const useDedicatedFunction = Boolean(import.meta.env.PROD && FUNCTIONS_BASE);
    const publicSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || import.meta.env.SUPABASE_ANON_KEY?.trim();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), preview ? 60_000 : 120_000);
    try {
      await Promise.all(targets.map(async (target) => {
        const providerTarget = target === 'skin' ? 'skin' : 'hair';
        const analysisEndpoint = useDedicatedFunction
          ? buildFunctionUrl(`analyze-${providerTarget}`)
          : buildApiUrl(`/analyze/${providerTarget}`);
        const response = await fetch(analysisEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(publicSupabaseKey ? { apikey: publicSupabaseKey } : {}),
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scanId: scan.id,
            preview,
            analysisScope: target,
            scanMode,
            ...(useDedicatedFunction ? {
              imageUrl: scan.image_url,
              multiAngleUrls: multiAngleUrls || scan.multi_angle_urls || {},
              calibration: captureInfo || scan.capture_info || undefined,
            } : {}),
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || `Analysis failed (${response.status})`);
        }
        const analysisData = await response.json();
        if (!analysisData?.success) throw new Error(analysisData?.error || 'Analysis failed');
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  };


  const prepareScan = async (user: { id: string }, preview = false) => {
    try {
      const token = await getApiAuthToken();
      await fetch(buildApiUrl('/storage/ensure-buckets'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (error) {
      console.warn('Unable to auto-create storage buckets:', error);
    }

    const storageBucket = analysisType === 'skin' ? 'skin-scans' : 'hair-scans';
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

    const uploadedImages = uploadResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);

    const frontAngle = angleConfig.required[0]?.id || 'front';
    const captureInfo = {
      scan_mode: analysisType,
      required_angles: REQUIRED_ANGLES,
      captured_angles: uploadedImages.map(i => i.angle),
      original_image_urls: uploadedImages.reduce<Record<string, string>>((acc, image) => {
        if (image.originalUrl) acc[image.angle] = image.originalUrl;
        return acc;
      }, {}),
      quality_scores: uploadedImages.map(i => ({
        angle: i.angle,
        blur: i.quality.blurScore,
        lighting: i.quality.lightingScore,
        exposure: i.quality.exposureScore,
        contrast: i.quality.contrastScore,
        scan_quality: i.quality.scanQuality || null,
      })),
      porosity_test_result: porosityResult,
    };
    const multiAngleUrls = uploadedImages.reduce<Record<string, string>>((acc, img) => ({
      ...acc,
      [img.angle]: img.url,
    }), {});
    const scanResponse = await fetch(buildApiUrl('/scans'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_url: uploadedImages.find(i => i.angle === frontAngle)?.url || uploadedImages[0].url,
        scan_type: analysisType,
        preview,

      }),
    });
    const scanPayload = await scanResponse.json().catch(() => ({}));
    if (!scanResponse.ok || !scanPayload?.id) {
      throw new Error(scanPayload?.error || `Unable to save scan (${scanResponse.status})`);
    }

    return { scan: scanPayload as ScanRecord, uploadedImages, captureInfo, multiAngleUrls };
  };

  const handleOneTimePreview = async () => {
    if (paymentLoading) return;

    try {
      setPaymentLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use your one-time scan.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const eligibilityToken = await getApiAuthToken();
      const eligibilityResponse = await fetch(buildApiUrl('/scans/preview-eligibility'), {
        headers: eligibilityToken ? { Authorization: `Bearer ${eligibilityToken}` } : {},
      });
      const eligibility = await eligibilityResponse.json().catch(() => ({}));
      if (!eligibilityResponse.ok || eligibility?.canUsePreview !== true) {
        throw new Error(eligibility?.message || eligibility?.error || 'Your one-time scan preview has already been used. Unlock the complete analysis to continue.');
      }

      const { scan, captureInfo, multiAngleUrls } = await prepareScan(user, true);
      await runAnalysis(scan, true, captureInfo, multiAngleUrls);
      toast({
        title: "Your scan preview is ready",
        description: "Review the first care notes, then unlock the complete guidance when you are ready.",
      });
      navigate(`/results/${scan.id}`);
    } catch (error) {
      console.error('One-time scan error:', error);
      toast({
        title: "Scan preview unavailable",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
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
        setShowPhonePrompt(true);
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
        String(activeSubscription.tier || activeSubscription.subscription_plans?.tier || '').toLowerCase() !== 'free' &&
        (maxScans === null || (maxScans > 0 && scansUsed < maxScans));

      if (hasRemainingSubscriptionScans) {
        const { scan, captureInfo, multiAngleUrls } = await prepareScan(user, false);
        await consumeSubscriptionScan();
        await runAnalysis(scan, false, captureInfo, multiAngleUrls);

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
      const { scan } = await prepareScan(user, false);
      // Keep scan/payment context available even if checkout redirects away from this page.
      sessionStorage.setItem('pendingPaymentType', paymentType);
      sessionStorage.setItem('pendingAnalysisScanId', scan.id);
      sessionStorage.setItem('paymentOption', option);
      if (paymentType === 'subscription') {
        sessionStorage.setItem('pendingSubscriptionPlanId', 'monthly-scan-plan');
      } else {
        sessionStorage.removeItem('pendingSubscriptionPlanId');
      }
      sessionStorage.setItem('pendingPaymentPage', JSON.stringify({
        amount,
        customerEmail: user.email || '',
        customerName: profileData?.full_name || user.email?.split('@')[0] || 'IMSTEV User',
        customerPhone: formattedPhone,
        paymentType,
        scanId: scan.id,
        planId: paymentType === 'subscription' ? 'monthly-scan-plan' : undefined,
        description: paymentType === 'subscription' ? 'Monthly Scan Plan' : `${analysisType === 'hair' ? 'Hair' : 'Skin'} Analysis`,
      }));

      setPaymentLoading(false);
      navigate('/payment');

    } catch (error) {
      console.error('Payment option error:', error);
      toast({
        title: "Payment Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setPaymentLoading(false);
      setSelectedPaymentOption(null);
    }
  };

  const stepLabels: Record<string, string> = {
    type: 'Select the care view you need',
    porosity: 'Test your hair porosity to choose suitable care',
    capture: 'Capture clear images for a careful assessment',
    review: 'Review your images before analysis',
    analyze: 'Ready to review your images'
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
        Continue with {SCAN_MODE_CONFIG[analysisType].label}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );

  const renderCaptureStep = () => (
    <div className="space-y-6">
      <ScannerGuidanceCard
        mode={analysisType}
        angle={currentAngleConfig}
        capturedCount={captures.length}
        requiredCount={REQUIRED_ANGLES.length}
      />

      {/* Angle selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Angle</CardTitle>
          <CardDescription>
            {REQUIRED_ANGLES.includes(currentAngle) ? 'Required' : 'Optional for better analysis'}
            <span className="block mt-1 text-xs">{currentAngleConfig?.description}</span>
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
                className="gap-2"
              >
                {angle.replace(/_/g, ' ')}
                {REQUIRED_ANGLES.includes(angle) && (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {captures.some(c => c.angle === angle) && (
                  <CheckCircle2 className="ml-2 h-3 w-3 text-success" />
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              size="lg"
              onClick={() => setShowLiveCamera(true)}
              disabled={processing}
              className="w-full sm:flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
              className="w-full sm:w-auto"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => uploadInputRef.current?.click()}
              disabled={processing}
              className="w-full sm:w-auto"
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

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStep('type')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Change Type
            </Button>
            <Button
              size="lg"
              onClick={handleProceedToReview}
              className="w-full sm:flex-1"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setStep('capture')}
          className="w-full sm:flex-1"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Add More
        </Button>
        <Button
          size="lg"
          onClick={() => setStep('analyze')}
          className="w-full sm:flex-1"
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
              <h3 className="text-2xl font-bold mb-2">Ready for {SCAN_MODE_CONFIG[analysisType].label}</h3>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setStep('review')}
          className="w-full sm:flex-1"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <div className="flex w-full flex-1 flex-col gap-3 sm:w-auto">
          <Button
            size="lg"
            onClick={handleOneTimePreview}
            disabled={paymentLoading}
            className="w-full"
          >
            {paymentLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Preparing your preview...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                View my one-time preview
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handlePayAndAnalyze}
            disabled={paymentLoading}
            className="w-full"
          >
            Unlock the complete analysis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (authChecking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f3ec] text-slate-900">
      <Navbar />

      <div className="gradient-mesh min-h-screen pb-24 sm:pb-0">
        <div className="container mx-auto min-w-0 max-w-4xl px-4 py-5 transition-all sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-4 flex items-center justify-between sm:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="-ml-2 w-full justify-start text-slate-600 dark:text-slate-400 sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="mb-4 rounded-2xl border border-primary/10 bg-white/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:mb-8 sm:rounded-[28px] sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Plain-language care notes
                </span>
                <h1 className="text-[2rem] leading-tight font-display font-bold text-slate-900 sm:text-4xl lg:text-5xl">
                  {SCAN_MODE_CONFIG[analysisType].shortLabel} <span className="text-gradient-premium">Analysis</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  {stepLabels[step]} Your images stay part of your private care record, ready for a clearer conversation with an IMSTEV specialist.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                {[
                  ['01', 'Capture'],
                  ['02', 'Understand'],
                  ['03', 'Nurture'],
                ].map(([number, label]) => (
                  <div key={number} className="min-w-0 rounded-2xl border border-primary/10 bg-white px-1.5 py-2 sm:min-w-[74px] sm:px-3 sm:py-3">
                    <p className="text-lg font-display font-bold text-primary">{number}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-7 flex min-w-0 justify-center gap-1.5 overflow-hidden pb-2 sm:mb-10 sm:gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 min-w-0 flex-1 rounded-full transition-all duration-300 sm:h-2 ${
                  steps.indexOf(step) >= i
                    ? 'max-w-12 bg-gradient-to-r from-purple-600 to-amber-500'
                    : 'max-w-8 bg-slate-200 dark:bg-slate-700'
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
            {step === 'analyze' && renderAnalyzeStep()}
          </div>
        </div>
      </div>

      <PhoneNumberPrompt
        isOpen={showPhonePrompt}
        onClose={() => setShowPhonePrompt(false)}
        onSaved={() => {
          setShowPhonePrompt(false);
          setShowPaymentOptionsModal(true);
        }}
      />

      {/* Payment Options Modal */}
      <PaymentOptionsModal
        isOpen={showPaymentOptionsModal}
        onClose={() => setShowPaymentOptionsModal(false)}
        onSelect={handlePaymentOptionSelect}
        isLoading={paymentLoading}
        userEmail={''}
      />

      <Footer />
    </div>
  );
};

export default Scan;
