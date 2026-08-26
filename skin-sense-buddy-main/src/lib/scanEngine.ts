export type ScanMode = 'skin' | 'hair' | 'scalp' | 'full';

export type ScanAngle = {
  id: string;
  label: string;
  description: string;
  instructions: string[];
};

export type ScanModeConfig = {
  label: string;
  shortLabel: string;
  description: string;
  purpose: string;
  requiredAngles: ScanAngle[];
  optionalAngles: ScanAngle[];
  qualityThreshold: number;
  analysisTargets: Array<'skin' | 'hair' | 'scalp'>;
};

export type ScanQuality = {
  score: number;
  threshold: number;
  resolutionScore: number;
  sharpnessScore: number;
  lightingScore: number;
  exposureScore: number;
  contrastScore: number;
  isAcceptable: boolean;
  status: 'ready' | 'retake';
  issues: string[];
  recommendations: string[];
};

const faceAngles: ScanAngle[] = [
  {
    id: 'front',
    label: 'Front',
    description: 'Face the camera directly with your face centred.',
    instructions: ['Keep both eyes visible', 'Relax your expression', 'Use even, indirect light'],
  },
  {
    id: 'left',
    label: 'Left side',
    description: 'Turn your head about 45° to the left.',
    instructions: ['Keep your face in the frame', 'Do not tilt up or down', 'Avoid hair covering the cheek'],
  },
  {
    id: 'right',
    label: 'Right side',
    description: 'Turn your head about 45° to the right.',
    instructions: ['Keep your face in the frame', 'Do not tilt up or down', 'Avoid hair covering the cheek'],
  },
  {
    id: 'close',
    label: 'Close-up',
    description: 'Move closer to the area you want to understand.',
    instructions: ['Tap to focus', 'Keep the area sharply visible', 'Avoid flash and filters'],
  },
];

const hairAngles: ScanAngle[] = [
  {
    id: 'front',
    label: 'Front',
    description: 'Show the front hairline, edges, and overall shape.',
    instructions: ['Move hair away from the face', 'Keep the hairline visible', 'Avoid filters and flash'],
  },
  {
    id: 'left',
    label: 'Left side',
    description: 'Show the left side, temple, and length.',
    instructions: ['Keep the side profile in frame', 'Show natural hair where possible', 'Avoid tight cropping'],
  },
  {
    id: 'right',
    label: 'Right side',
    description: 'Show the right side, temple, and length.',
    instructions: ['Keep the side profile in frame', 'Show natural hair where possible', 'Avoid tight cropping'],
  },
  {
    id: 'top',
    label: 'Top / crown',
    description: 'Aim down at the crown to show density and texture.',
    instructions: ['Part the hair if scalp visibility is needed', 'Keep the crown evenly lit', 'Remove wigs or extensions when relevant'],
  },
  {
    id: 'back',
    label: 'Back / nape',
    description: 'Show the back of the head and nape area.',
    instructions: ['Ask someone to help if needed', 'Keep the nape visible', 'Avoid motion blur'],
  },
];

const scalpAngles: ScanAngle[] = [
  {
    id: 'hairline',
    label: 'Hairline',
    description: 'Show the hairline and edges in close detail.',
    instructions: ['Move hair away from the hairline', 'Use soft, even light', 'Do not apply a filter'],
  },
  {
    id: 'crown',
    label: 'Crown',
    description: 'Part the hair to show the crown and scalp surface.',
    instructions: ['Expose the scalp between partings', 'Tap to focus', 'Keep the camera steady'],
  },
  {
    id: 'left_temple',
    label: 'Left temple',
    description: 'Show the left temple and surrounding scalp.',
    instructions: ['Part the hair gently', 'Avoid pulling tightly', 'Keep the region well lit'],
  },
  {
    id: 'right_temple',
    label: 'Right temple',
    description: 'Show the right temple and surrounding scalp.',
    instructions: ['Part the hair gently', 'Avoid pulling tightly', 'Keep the region well lit'],
  },
];

const uniqueAngles = (...groups: ScanAngle[][]) => {
  const seen = new Set<string>();
  return groups.flat().filter((angle) => {
    if (seen.has(angle.id)) return false;
    seen.add(angle.id);
    return true;
  });
};

export const SCAN_MODE_CONFIG: Record<ScanMode, ScanModeConfig> = {
  skin: {
    label: 'Skin & face scan',
    shortLabel: 'Skin',
    description: 'Understand visible skin characteristics, texture, tone, hydration, and areas that deserve attention.',
    purpose: 'A unified face assessment from multiple views.',
    requiredAngles: faceAngles,
    optionalAngles: [],
    qualityThreshold: 62,
    analysisTargets: ['skin'],
  },
  hair: {
    label: 'Hair scan',
    shortLabel: 'Hair',
    description: 'Review hair pattern, density, texture, dryness, breakage, and visible damage indicators.',
    purpose: 'A complete hair overview for natural, relaxed, braided, loc’d, wigged, and colour-treated hair.',
    requiredAngles: hairAngles,
    optionalAngles: [],
    qualityThreshold: 60,
    analysisTargets: ['hair'],
  },
  scalp: {
    label: 'Scalp scan',
    shortLabel: 'Scalp',
    description: 'Review visible scalp patterns such as dryness, scaling, buildup, redness, and density changes.',
    purpose: 'A targeted scalp review. It does not diagnose medical disorders from a photograph.',
    requiredAngles: scalpAngles,
    optionalAngles: [{
      id: 'additional',
      label: 'Additional area',
      description: 'Capture any other area that needs a closer look.',
      instructions: ['Choose the area with the clearest concern', 'Keep it sharply focused', 'Use natural or soft indoor light'],
    }],
    qualityThreshold: 65,
    analysisTargets: ['scalp'],
  },
  full: {
    label: 'Full care scan',
    shortLabel: 'Full scan',
    description: 'Combine a face, hair, and scalp review into one private care record.',
    purpose: 'The broadest view: skin, hair, and visible scalp evidence considered together.',
    requiredAngles: uniqueAngles(faceAngles, hairAngles.slice(3), scalpAngles.slice(0, 2)),
    optionalAngles: [{
      id: 'additional',
      label: 'Additional area',
      description: 'Add one more close-up when the standard views are not enough.',
      instructions: ['Choose the most relevant area', 'Keep the image clear', 'Avoid guessing what cannot be seen'],
    }],
    qualityThreshold: 62,
    analysisTargets: ['skin', 'hair', 'scalp'],
  },
};

export const getScanAngles = (mode: ScanMode) => ({
  required: SCAN_MODE_CONFIG[mode].requiredAngles,
  optional: SCAN_MODE_CONFIG[mode].optionalAngles,
  all: [...SCAN_MODE_CONFIG[mode].requiredAngles, ...SCAN_MODE_CONFIG[mode].optionalAngles],
});

export const getScanQuality = (
  width: number,
  height: number,
  quality: { blurScore: number; lightingScore: number; exposureScore: number; contrastScore: number; issues?: string[]; recommendations?: string[] },
  mode: ScanMode,
): ScanQuality => {
  const shortestSide = Math.min(width, height);
  const resolutionScore = shortestSide >= 1440 ? 100 : shortestSide >= 1080 ? 92 : shortestSide >= 720 ? 78 : shortestSide >= 480 ? 60 : 35;
  const sharpnessScore = Math.max(0, Math.min(100, quality.blurScore));
  const lightingScore = Math.max(0, Math.min(100, quality.lightingScore));
  const exposureScore = Math.max(0, Math.min(100, quality.exposureScore));
  const contrastScore = Math.max(0, Math.min(100, quality.contrastScore));
  const score = Math.round(
    resolutionScore * 0.2 +
    sharpnessScore * 0.28 +
    lightingScore * 0.24 +
    exposureScore * 0.14 +
    contrastScore * 0.14,
  );
  const issues = [...(quality.issues || [])];
  const recommendations = [...(quality.recommendations || [])];
  if (resolutionScore < 60) {
    issues.push('Resolution is too low for a reliable close review');
    recommendations.push('Move closer or use a higher-resolution camera');
  }
  if (sharpnessScore < 55) recommendations.push('Hold still and tap the area to focus');
  if (lightingScore < 65) recommendations.push('Use soft daylight and avoid harsh shadows');
  if (contrastScore < 50) recommendations.push('Clean the lens and improve even lighting');
  const threshold = SCAN_MODE_CONFIG[mode].qualityThreshold;
  const isAcceptable = score >= threshold && sharpnessScore >= 45 && lightingScore >= 50 && contrastScore >= 40;
  return {
    score,
    threshold,
    resolutionScore,
    sharpnessScore,
    lightingScore,
    exposureScore,
    contrastScore,
    isAcceptable,
    status: isAcceptable ? 'ready' : 'retake',
    issues: [...new Set(issues)],
    recommendations: [...new Set(recommendations)],
  };
};

export const getQualityFailureMessage = (quality: ScanQuality) => {
  if (quality.issues.length > 0) return quality.issues[0];
  return `This image scored ${quality.score}/100. We need a clearer capture before analysing it.`;
};

export const isScanMode = (value: unknown): value is ScanMode => (
  value === 'skin' || value === 'hair' || value === 'scalp' || value === 'full'
);
