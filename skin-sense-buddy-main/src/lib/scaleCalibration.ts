/**
 * Scale Calibration Utilities
 * Detect and measure reference objects (coins, rulers) for size estimation
 */

interface ReferenceObject {
  type: 'coin' | 'ruler' | 'card' | 'custom';
  name: string;
  diameter_mm?: number;
  length_mm?: number;
  width_mm?: number;
}

// Common reference objects with known dimensions
export const REFERENCE_OBJECTS: Record<string, ReferenceObject> = {
  'us_quarter': { type: 'coin', name: 'US Quarter', diameter_mm: 24.26 },
  'us_penny': { type: 'coin', name: 'US Penny', diameter_mm: 19.05 },
  'us_nickel': { type: 'coin', name: 'US Nickel', diameter_mm: 21.21 },
  'us_dime': { type: 'coin', name: 'US Dime', diameter_mm: 17.91 },
  'euro_1': { type: 'coin', name: '1 Euro Coin', diameter_mm: 23.25 },
  'euro_2': { type: 'coin', name: '2 Euro Coin', diameter_mm: 25.75 },
  'gbp_1': { type: 'coin', name: '£1 Coin', diameter_mm: 23.43 },
  'gbp_2': { type: 'coin', name: '£2 Coin', diameter_mm: 28.40 },
  'credit_card': { type: 'card', name: 'Credit Card', length_mm: 85.6, width_mm: 53.98 },
  'ruler_cm': { type: 'ruler', name: 'Ruler (1cm)', length_mm: 10 }
};

interface CircleDetection {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

/**
 * Detect circular objects (coins) in image using edge detection
 */
export const detectCircles = (canvas: HTMLCanvasElement): CircleDetection[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(luminance);
  }

  // Apply Gaussian blur
  const blurred = applyGaussianBlur(gray, width, height);

  // Sobel edge detection
  const edges = sobelEdgeDetection(blurred, width, height);

  // Hough circle transform (simplified)
  const circles = houghCircleTransform(edges, width, height);

  return circles;
};

/**
 * Apply Gaussian blur for noise reduction
 */
const applyGaussianBlur = (gray: number[], width: number, height: number): number[] => {
  const kernel = [
    1/16, 2/16, 1/16,
    2/16, 4/16, 2/16,
    1/16, 2/16, 1/16
  ];

  const blurred: number[] = new Array(gray.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      let sum = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (y + ky) * width + (x + kx);
          sum += gray[kidx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }

      blurred[idx] = sum;
    }
  }

  return blurred;
};

/**
 * Sobel edge detection
 */
const sobelEdgeDetection = (gray: number[], width: number, height: number): number[] => {
  const edges: number[] = new Array(gray.length).fill(0);

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[kidx] * sobelX[kernelIdx];
          gy += gray[kidx] * sobelY[kernelIdx];
        }
      }

      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edges;
};

/**
 * Simplified Hough circle transform
 */
const houghCircleTransform = (edges: number[], width: number, height: number): CircleDetection[] => {
  const circles: CircleDetection[] = [];
  const minRadius = 20;
  const maxRadius = Math.min(width, height) / 4;
  const threshold = 50;

  // Accumulator space
  const acc: Map<string, number> = new Map();

  // Sample edge points
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = y * width + x;
      if (edges[idx] > threshold) {
        // Try different radii
        for (let r = minRadius; r < maxRadius; r += 5) {
          // Sample circle points
          for (let angle = 0; angle < 360; angle += 30) {
            const rad = (angle * Math.PI) / 180;
            const cx = Math.round(x - r * Math.cos(rad));
            const cy = Math.round(y - r * Math.sin(rad));

            if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
              const key = `${cx},${cy},${r}`;
              acc.set(key, (acc.get(key) || 0) + 1);
            }
          }
        }
      }
    }
  }

  // Find peaks in accumulator
  const votes = Array.from(acc.entries()).sort((a, b) => b[1] - a[1]);

  for (let i = 0; i < Math.min(3, votes.length); i++) {
    const [key, count] = votes[i];
    if (count > 20) {
      const [x, y, r] = key.split(',').map(Number);
      circles.push({
        x,
        y,
        radius: r,
        confidence: Math.min(100, count / 2)
      });
    }
  }

  return circles;
};

/**
 * Calculate pixels per millimeter based on detected reference object
 */
export const calculatePixelsPerMM = (
  detectedRadius: number,
  referenceObject: ReferenceObject
): number => {
  if (!referenceObject.diameter_mm) return 1;
  
  const actualDiameterMM = referenceObject.diameter_mm;
  const detectedDiameterPixels = detectedRadius * 2;
  
  return detectedDiameterPixels / actualDiameterMM;
};

/**
 * Estimate lesion size in millimeters
 */
export const estimateLesionSize = (
  lesionPixels: number,
  pixelsPerMM: number
): { size_mm: number; confidence: 'high' | 'medium' | 'low' } => {
  const sizeMM = lesionPixels / pixelsPerMM;
  
  // Confidence based on whether scale was provided
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (pixelsPerMM === 1) {
    confidence = 'low'; // No scale calibration
  } else if (pixelsPerMM > 0.5 && pixelsPerMM < 50) {
    confidence = 'high'; // Reasonable scale detected
  }
  
  return { size_mm: Math.round(sizeMM * 10) / 10, confidence };
};

/**
 * Draw calibration overlay on canvas
 */
export const drawCalibrationOverlay = (
  canvas: HTMLCanvasElement,
  circles: CircleDetection[],
  selectedIndex: number = -1
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#10b981';

  circles.forEach((circle, index) => {
    const isSelected = index === selectedIndex;
    
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#10b981';
    ctx.lineWidth = isSelected ? 4 : 2;
    
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(circle.x - 10, circle.y);
    ctx.lineTo(circle.x + 10, circle.y);
    ctx.moveTo(circle.x, circle.y - 10);
    ctx.lineTo(circle.x, circle.y + 10);
    ctx.stroke();
    
    // Draw label
    const label = `${Math.round(circle.radius * 2)}px`;
    ctx.fillText(label, circle.x + circle.radius + 10, circle.y);
  });
};
