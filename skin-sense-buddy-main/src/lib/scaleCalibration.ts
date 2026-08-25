/** Scale calibration utilities for estimating lesion size from a known reference object. */

interface ReferenceObject {
  type: 'coin' | 'ruler' | 'card' | 'custom';
  name: string;
  diameter_mm?: number;
  length_mm?: number;
  width_mm?: number;
}

export const REFERENCE_OBJECTS: Record<string, ReferenceObject> = {
  ngn_1: { type: 'coin', name: '₦1 Naira Coin', diameter_mm: 22 },
  ngn_2: { type: 'coin', name: '₦2 Naira Coin', diameter_mm: 24 },
  ngn_50k: { type: 'coin', name: '50 Kobo Coin', diameter_mm: 19.5 },
  us_quarter: { type: 'coin', name: 'US Quarter', diameter_mm: 24.26 },
  us_penny: { type: 'coin', name: 'US Penny', diameter_mm: 19.05 },
  us_nickel: { type: 'coin', name: 'US Nickel', diameter_mm: 21.21 },
  us_dime: { type: 'coin', name: 'US Dime', diameter_mm: 17.91 },
  euro_1: { type: 'coin', name: '1 Euro Coin', diameter_mm: 23.25 },
  euro_2: { type: 'coin', name: '2 Euro Coin', diameter_mm: 25.75 },
  gbp_1: { type: 'coin', name: '£1 Coin', diameter_mm: 23.43 },
  gbp_2: { type: 'coin', name: '£2 Coin', diameter_mm: 28.4 },
  credit_card: { type: 'card', name: 'Credit Card', length_mm: 85.6, width_mm: 53.98 },
  ruler_cm: { type: 'ruler', name: 'Ruler (1cm)', length_mm: 10 },
};

export interface CircleDetection {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

export const detectCircles = (canvas: HTMLCanvasElement): CircleDetection[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const width = canvas.width;
  const height = canvas.height;
  const gray: number[] = [];

  for (let index = 0; index < data.length; index += 4) {
    gray.push(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
  }

  const blurred = applyGaussianBlur(gray, width, height);
  const edges = sobelEdgeDetection(blurred, width, height);
  return houghCircleTransform(edges, width, height);
};

const applyGaussianBlur = (gray: number[], width: number, height: number): number[] => {
  const kernel = [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16];
  const blurred = new Array<number>(gray.length).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      let sum = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sampleIndex = (y + ky) * width + (x + kx);
          sum += gray[sampleIndex] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      blurred[index] = sum;
    }
  }
  return blurred;
};

const sobelEdgeDetection = (gray: number[], width: number, height: number): number[] => {
  const edges = new Array<number>(gray.length).fill(0);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sampleIndex = (y + ky) * width + (x + kx);
          const kernelIndex = (ky + 1) * 3 + (kx + 1);
          gx += gray[sampleIndex] * sobelX[kernelIndex];
          gy += gray[sampleIndex] * sobelY[kernelIndex];
        }
      }
      edges[index] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
};

const houghCircleTransform = (edges: number[], width: number, height: number): CircleDetection[] => {
  const circles: CircleDetection[] = [];
  const minRadius = 20;
  const maxRadius = Math.min(width, height) / 4;
  const threshold = 50;
  const accumulator = new Map<string, number>();

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (edges[y * width + x] <= threshold) continue;
      for (let radius = minRadius; radius < maxRadius; radius += 5) {
        for (let angle = 0; angle < 360; angle += 30) {
          const radians = (angle * Math.PI) / 180;
          const centerX = Math.round(x - radius * Math.cos(radians));
          const centerY = Math.round(y - radius * Math.sin(radians));
          if (centerX < 0 || centerX >= width || centerY < 0 || centerY >= height) continue;
          const key = `${centerX},${centerY},${radius}`;
          accumulator.set(key, (accumulator.get(key) || 0) + 1);
        }
      }
    }
  }

  const votes = Array.from(accumulator.entries()).sort((a, b) => b[1] - a[1]);
  for (let index = 0; index < Math.min(3, votes.length); index += 1) {
    const [key, count] = votes[index];
    if (count <= 20) continue;
    const [x, y, radius] = key.split(',').map(Number);
    circles.push({ x, y, radius, confidence: Math.min(100, count / 2) });
  }
  return circles;
};

export const calculatePixelsPerMM = (detectedRadius: number, referenceObject: ReferenceObject): number => {
  if (!referenceObject.diameter_mm) return 1;
  return (detectedRadius * 2) / referenceObject.diameter_mm;
};

export const estimateLesionSize = (
  lesionPixels: number,
  pixelsPerMM: number,
): { size_mm: number; confidence: 'high' | 'medium' | 'low' } => {
  const sizeMM = lesionPixels / pixelsPerMM;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (pixelsPerMM === 1) confidence = 'low';
  else if (pixelsPerMM > 0.5 && pixelsPerMM < 50) confidence = 'high';
  return { size_mm: Math.round(sizeMM * 10) / 10, confidence };
};

export const drawCalibrationOverlay = (
  canvas: HTMLCanvasElement,
  circles: CircleDetection[],
  selectedIndex = -1,
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = 'bold 16px sans-serif';
  circles.forEach((circle, index) => {
    const selected = index === selectedIndex;
    ctx.strokeStyle = selected ? '#3b82f6' : '#10b981';
    ctx.lineWidth = selected ? 4 : 2;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(circle.x - 10, circle.y);
    ctx.lineTo(circle.x + 10, circle.y);
    ctx.moveTo(circle.x, circle.y - 10);
    ctx.lineTo(circle.x, circle.y + 10);
    ctx.stroke();
    ctx.fillStyle = selected ? '#3b82f6' : '#10b981';
    ctx.fillText(`${Math.round(circle.radius * 2)}px`, circle.x + circle.radius + 10, circle.y);
  });
};
