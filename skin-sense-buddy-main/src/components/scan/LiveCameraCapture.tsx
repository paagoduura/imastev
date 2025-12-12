import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, SwitchCamera, X, ZoomIn, ZoomOut, FlipHorizontal, FlipVertical, AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (imageBlob: Blob, dataUrl: string) => void;
  onClose: () => void;
  captureLabel?: string;
}

export const LiveCameraCapture = ({ onCapture, onClose, captureLabel = "Capture" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'notfound' | 'insecure' | 'unsupported' | 'generic' | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFlippedVertical, setIsFlippedVertical] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  const checkCameraSupport = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorType('unsupported');
      setError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.');
      return false;
    }

    if (window.isSecureContext === false) {
      setErrorType('insecure');
      setError('Camera access requires a secure connection (HTTPS). Please access this site via HTTPS.');
      return false;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        
        result.addEventListener('change', () => {
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        });
      }
    } catch {
    }

    return true;
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);

    const isSupported = await checkCameraSupport();
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          videoRef.current.onerror = () => {
            reject(new Error('Failed to load video stream'));
          };
          
          setTimeout(() => reject(new Error('Video load timeout')), 10000);
        });
      }
    } catch (err: any) {
      console.error('Camera error:', err?.name, err?.message, err);
      
      const errorName = err?.name || '';
      const errorMessage = err?.message || '';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setErrorType('permission');
        setPermissionState('denied');
        setError('Camera permission was denied. Please click the camera icon in your browser\'s address bar and allow access, then try again.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setErrorType('notfound');
        setError('No camera was found on this device. Please connect a camera or use the upload option instead.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setErrorType('generic');
        setError('Camera is being used by another application. Please close other apps using the camera and try again.');
      } else if (errorName === 'OverconstrainedError') {
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setStream(basicStream);
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            await videoRef.current.play();
          }
          setIsLoading(false);
          return;
        } catch {
          setErrorType('generic');
          setError('Could not access camera with requested settings. Please try again.');
        }
      } else if (errorMessage.includes('timeout')) {
        setErrorType('generic');
        setError('Camera took too long to respond. Please try again.');
      } else {
        setErrorType('generic');
        setError('Unable to access camera. Please try uploading an image instead, or check that no other app is using your camera.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream, checkCameraSupport]);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    
    let translateX = 0;
    let translateY = 0;
    let scaleX = 1;
    let scaleY = 1;
    
    if (isMirrored) {
      translateX = canvas.width;
      scaleX = -1;
    }
    
    if (isFlippedVertical) {
      translateY = canvas.height;
      scaleY = -1;
    }
    
    ctx.translate(translateX, translateY);
    ctx.scale(scaleX, scaleY);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onCapture(blob, dataUrl);
      }
    }, 'image/jpeg', 0.92);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 1));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Live Camera</CardTitle>
            <CardDescription>Position your camera for the best capture</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 animate-pulse text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                  {errorType === 'permission' ? (
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  ) : errorType === 'notfound' ? (
                    <Camera className="w-8 h-8 text-slate-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">
                    {errorType === 'permission' ? 'Camera Permission Needed' :
                     errorType === 'notfound' ? 'No Camera Detected' :
                     errorType === 'insecure' ? 'Secure Connection Required' :
                     errorType === 'unsupported' ? 'Browser Not Supported' :
                     'Camera Unavailable'}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
                </div>
                
                {errorType === 'permission' && (
                  <div className="text-xs text-slate-400 bg-slate-700/50 rounded-lg p-3 space-y-1">
                    <p className="font-medium text-slate-300">How to enable camera:</p>
                    <p>1. Look for the camera icon in your browser's address bar</p>
                    <p>2. Click it and select "Allow"</p>
                    <p>3. Click "Try Again" below</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    onClick={startCamera} 
                    className="bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={onClose} 
                    variant="ghost" 
                    className="text-slate-400 hover:text-white"
                  >
                    Use Upload Instead
                  </Button>
                </div>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${zoom}) ${isMirrored ? 'scaleX(-1)' : ''} ${isFlippedVertical ? 'scaleY(-1)' : ''}`,
              transition: 'transform 0.2s ease'
            }}
          />

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/50" />
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-white/50" />
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 space-y-4">
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMirrored(!isMirrored)}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFlippedVertical(!isFlippedVertical)}
              title="Flip Vertical"
            >
              <FlipVertical className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleCamera}
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleCapture}
            disabled={isLoading || !!error}
          >
            <Camera className="mr-2 h-5 w-5" />
            {captureLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
