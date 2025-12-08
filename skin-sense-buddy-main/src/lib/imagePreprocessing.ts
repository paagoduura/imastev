/**
 * Advanced Image Preprocessing Utilities
 * Medical-grade image quality analysis and enhancement
 */

interface ImageQualityMetrics {
  blurScore: number;
  lightingScore: number;
  contrastScore: number;
  exposureScore: number;
  isAcceptable: boolean;
  issues: string[];
  recommendations: string[];
}

interface PreprocessedImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  quality: ImageQualityMetrics;
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

/**
 * Detect blur using Laplacian variance method
 * Higher scores = sharper image, lower scores = blurrier
 */
export const detectBlur = (canvas: HTMLCanvasElement): number => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Convert to grayscale and compute Laplacian
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray.push(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Compute Laplacian variance (edge detection)
  let variance = 0;
  let mean = 0;
  const width = canvas.width;
  
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = y * width + x;
      const laplacian = 
        -gray[idx - width] - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] - gray[idx + width];
      mean += laplacian;
    }
  }
  
  mean /= ((canvas.width - 2) * (canvas.height - 2));
  
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = y * width + x;
      const laplacian = 
        -gray[idx - width] - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] - gray[idx + width];
      variance += Math.pow(laplacian - mean, 2);
    }
  }
  
  variance /= ((canvas.width - 2) * (canvas.height - 2));
  
  return variance;
};

/**
 * Analyze lighting quality using histogram analysis
 */
export const analyzeLighting = (canvas: HTMLCanvasElement): number => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Build luminance histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[luminance]++;
  }
  
  const totalPixels = canvas.width * canvas.height;
  
  // Check for underexposure (too dark)
  const darkPixels = histogram.slice(0, 50).reduce((a, b) => a + b, 0);
  const darkRatio = darkPixels / totalPixels;
  
  // Check for overexposure (too bright)
  const brightPixels = histogram.slice(205, 256).reduce((a, b) => a + b, 0);
  const brightRatio = brightPixels / totalPixels;
  
  // Calculate histogram spread (contrast indicator)
  let mean = 0;
  for (let i = 0; i < 256; i++) {
    mean += i * histogram[i];
  }
  mean /= totalPixels;
  
  let variance = 0;
  for (let i = 0; i < 256; i++) {
    variance += histogram[i] * Math.pow(i - mean, 2);
  }
  variance /= totalPixels;
  const stdDev = Math.sqrt(variance);
  
  // Score based on ideal conditions
  let score = 100;
  
  // Penalize extreme dark/bright areas
  if (darkRatio > 0.3) score -= (darkRatio - 0.3) * 200;
  if (brightRatio > 0.2) score -= (brightRatio - 0.2) * 250;
  
  // Penalize low contrast (low std dev means flat histogram)
  if (stdDev < 40) score -= (40 - stdDev);
  
  // Ensure mean is in acceptable range (70-170 is good for skin tones)
  if (mean < 70) score -= (70 - mean) / 2;
  if (mean > 170) score -= (mean - 170) / 2;
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Correct white balance and color temperature
 */
export const correctWhiteBalance = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Calculate average RGB values (gray world assumption)
  let avgR = 0, avgG = 0, avgB = 0;
  const pixelCount = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    avgR += data[i];
    avgG += data[i + 1];
    avgB += data[i + 2];
  }
  
  avgR /= pixelCount;
  avgG /= pixelCount;
  avgB /= pixelCount;
  
  // Calculate gray reference (average of averages)
  const grayRef = (avgR + avgG + avgB) / 3;
  
  // Calculate correction factors
  const rScale = grayRef / avgR;
  const gScale = grayRef / avgG;
  const bScale = grayRef / avgB;
  
  // Apply correction with clamping
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] * rScale));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * gScale));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bScale));
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Enhance contrast using adaptive histogram equalization
 */
export const enhanceContrast = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Build histogram for each channel
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
  }
  
  const pixelCount = data.length / 4;
  
  // Build cumulative distribution functions
  const cdfR = [histR[0]];
  const cdfG = [histG[0]];
  const cdfB = [histB[0]];
  
  for (let i = 1; i < 256; i++) {
    cdfR[i] = cdfR[i - 1] + histR[i];
    cdfG[i] = cdfG[i - 1] + histG[i];
    cdfB[i] = cdfB[i - 1] + histB[i];
  }
  
  // Normalize and create lookup tables
  const cdfMin = Math.min(
    cdfR.find(v => v > 0) || 0,
    cdfG.find(v => v > 0) || 0,
    cdfB.find(v => v > 0) || 0
  );
  
  const lutR: number[] = [];
  const lutG: number[] = [];
  const lutB: number[] = [];
  
  for (let i = 0; i < 256; i++) {
    lutR[i] = Math.round(((cdfR[i] - cdfMin) / (pixelCount - cdfMin)) * 255);
    lutG[i] = Math.round(((cdfG[i] - cdfMin) / (pixelCount - cdfMin)) * 255);
    lutB[i] = Math.round(((cdfB[i] - cdfMin) / (pixelCount - cdfMin)) * 255);
  }
  
  // Apply equalization (subtle: blend 30% with original)
  for (let i = 0; i < data.length; i += 4) {
    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];
    
    data[i] = Math.round(origR * 0.7 + lutR[origR] * 0.3);
    data[i + 1] = Math.round(origG * 0.7 + lutG[origG] * 0.3);
    data[i + 2] = Math.round(origB * 0.7 + lutB[origB] * 0.3);
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Reduce noise while preserving edges
 */
export const reduceNoise = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const output = new Uint8ClampedArray(data);
  
  // Apply bilateral filter (simplified version for performance)
  const spatialSigma = 3;
  const rangeSigma = 40;
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = (y * width + x) * 4;
      
      let sumR = 0, sumG = 0, sumB = 0;
      let weightSum = 0;
      
      // 5x5 kernel
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const kidx = ((y + ky) * width + (x + kx)) * 4;
          
          // Spatial weight
          const spatialDist = Math.sqrt(kx * kx + ky * ky);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));
          
          // Range weight
          const rDiff = data[idx] - data[kidx];
          const gDiff = data[idx + 1] - data[kidx + 1];
          const bDiff = data[idx + 2] - data[kidx + 2];
          const colorDist = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
          const rangeWeight = Math.exp(-(colorDist * colorDist) / (2 * rangeSigma * rangeSigma));
          
          const weight = spatialWeight * rangeWeight;
          
          sumR += data[kidx] * weight;
          sumG += data[kidx + 1] * weight;
          sumB += data[kidx + 2] * weight;
          weightSum += weight;
        }
      }
      
      if (weightSum > 0) {
        output[idx] = Math.round(sumR / weightSum);
        output[idx + 1] = Math.round(sumG / weightSum);
        output[idx + 2] = Math.round(sumB / weightSum);
      }
    }
  }
  
  // Copy filtered data back
  for (let i = 0; i < data.length; i += 4) {
    data[i] = output[i];
    data[i + 1] = output[i + 1];
    data[i + 2] = output[i + 2];
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Comprehensive image quality assessment
 */
export const assessImageQuality = (canvas: HTMLCanvasElement): ImageQualityMetrics => {
  const blurScore = detectBlur(canvas);
  const lightingScore = analyzeLighting(canvas);
  
  // Normalized blur score (higher is better)
  // Typical sharp medical images: 100-500, blurry: < 50
  const normalizedBlur = Math.min(100, (blurScore / 100) * 100);
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
  
  // Calculate contrast score
  let contrastScore = 100;
  if (imageData) {
    const data = imageData.data;
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
    }
    const range = max - min;
    contrastScore = Math.min(100, (range / 255) * 100);
  }
  
  const exposureScore = lightingScore;
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Blur assessment
  if (normalizedBlur < 40) {
    issues.push('Image is too blurry');
    recommendations.push('Hold camera steady and ensure autofocus is engaged');
  } else if (normalizedBlur < 60) {
    issues.push('Image sharpness could be improved');
    recommendations.push('Try tapping to focus on the affected area');
  }
  
  // Lighting assessment
  if (lightingScore < 50) {
    issues.push('Poor lighting conditions');
    recommendations.push('Use natural daylight or bright indoor lighting');
  } else if (lightingScore < 70) {
    issues.push('Lighting could be improved');
    recommendations.push('Avoid harsh shadows and direct flash');
  }
  
  // Contrast assessment
  if (contrastScore < 40) {
    issues.push('Low contrast');
    recommendations.push('Ensure good lighting and clean camera lens');
  }
  
  const isAcceptable = normalizedBlur >= 40 && lightingScore >= 50 && contrastScore >= 40;
  
  return {
    blurScore: normalizedBlur,
    lightingScore,
    contrastScore,
    exposureScore,
    isAcceptable,
    issues,
    recommendations
  };
};

/**
 * Main preprocessing pipeline
 */
export const preprocessImage = async (
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    applyEnhancements?: boolean;
  } = {}
): Promise<PreprocessedImage> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.92,
    applyEnhancements = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const originalSize = file.size;
    
    img.onload = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Assess quality before enhancements
        const qualityMetrics = assessImageQuality(canvas);
        
        // Apply enhancements if requested and needed
        if (applyEnhancements) {
          if (qualityMetrics.lightingScore < 80) {
            correctWhiteBalance(canvas);
          }
          if (qualityMetrics.contrastScore < 70) {
            enhanceContrast(canvas);
          }
          if (qualityMetrics.blurScore < 70) {
            reduceNoise(canvas);
          }
        }
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            resolve({
              dataUrl,
              blob,
              width,
              height,
              quality: qualityMetrics,
              metadata: {
                originalSize,
                compressedSize: blob.size,
                compressionRatio: (1 - blob.size / originalSize) * 100
              }
            });
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
