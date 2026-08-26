export type AnalysisScope = 'skin' | 'hair' | 'scalp' | 'full';

export type NormalizedFinding = {
  condition: string;
  name: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe';
  explanation: string;
  evidence_quality: 'strong' | 'moderate' | 'limited';
  analysis_status: 'supported' | 'qualified' | 'unable_to_determine';
};

export type NormalizedAnalysis = Record<string, unknown> & {
  conditions: NormalizedFinding[];
  primary_condition: string;
  confidence_score: number;
  severity: 'mild' | 'moderate' | 'severe';
  triage_level: 'self_care' | 'see_gp' | 'see_trichologist' | 'see_dermatologist' | 'urgent_care';
  safety_flags: string[];
  evidence_quality: 'strong' | 'moderate' | 'limited';
  analysis_status: 'supported' | 'qualified' | 'unable_to_determine';
};

const placeholderValues = new Set([
  '',
  'uncertain',
  'unknown',
  'n/a',
  'not enough information',
  'insufficient information',
  'unable to determine',
  'insufficient visual evidence',
]);

const medicalScalpTerms = /(alopecia|fungal|psoriasis|dermatitis|infection|ringworm|medical disorder)/i;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function isPlaceholder(value: unknown) {
  return placeholderValues.has(text(value).toLowerCase());
}

function percent(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const normalized = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

function severity(value: unknown): NormalizedFinding['severity'] {
  const normalized = text(value).toLowerCase();
  return normalized === 'severe' || normalized === 'moderate' ? normalized : 'mild';
}

function triage(value: unknown, scope: AnalysisScope): NormalizedAnalysis['triage_level'] {
  const normalized = text(value).toLowerCase();
  if (normalized === 'urgent_care') return 'urgent_care';
  if (normalized === 'see_dermatologist') return 'see_dermatologist';
  if (normalized === 'see_trichologist') return 'see_gp';
  if (normalized === 'see_gp') return 'see_gp';
  return scope === 'hair' || scope === 'scalp' ? 'self_care' : 'self_care';
}

function evidenceQuality(confidence: number, explanation: string, qualityScore?: number) {
  const evidenceScore = qualityScore === undefined ? confidence : Math.round((confidence + qualityScore) / 2);
  if (evidenceScore >= 75 && explanation.length >= 20) return 'strong' as const;
  if (evidenceScore >= 50 && explanation.length >= 8) return 'moderate' as const;
  return 'limited' as const;
}

export function normalizeAnalysis(raw: unknown, scope: AnalysisScope, qualityScore?: number): NormalizedAnalysis {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const rawConditions = Array.isArray(source.conditions) ? source.conditions : [];
  const confidenceScore = percent(source.confidence_score, 0);
  const findings = rawConditions
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 5)
    .map((item) => {
      const rawName = !isPlaceholder(item.condition) ? item.condition : item.name;
      const name = text(rawName, 'Visible pattern');
      const confidence = percent(item.confidence, confidenceScore);
      const explanation = text(item.explanation, 'The available image provides limited visual evidence for this finding.');
      const status = confidence < 45 || evidenceQuality(confidence, explanation, qualityScore) === 'limited'
        ? 'unable_to_determine'
        : confidence < 65 ? 'qualified' : 'supported';
      return {
        condition: name,
        name,
        confidence,
        severity: severity(item.severity || source.severity),
        explanation,
        evidence_quality: evidenceQuality(confidence, explanation, qualityScore),
        analysis_status: status,
      };
    });

  const firstFinding = findings[0];
  const requestedPrimary = text(source.primary_condition);
  const primary = !isPlaceholder(requestedPrimary)
    ? requestedPrimary
    : firstFinding?.condition || 'Insufficient visual evidence';
  const primaryConfidence = firstFinding?.confidence || confidenceScore;
  const safetyFlags: string[] = [];
  if (qualityScore !== undefined && qualityScore < 65) safetyFlags.push('poor_image_quality');
  if (primaryConfidence < 45) safetyFlags.push('low_confidence');
  if (findings.length > 1) {
    const spread = Math.max(...findings.map((item) => item.confidence)) - Math.min(...findings.map((item) => item.confidence));
    if (spread >= 45) safetyFlags.push('conflicting_observations');
  }
  if ((scope === 'scalp' || scope === 'full') && medicalScalpTerms.test(primary)) {
    safetyFlags.push('professional_assessment_recommended');
  }
  const overallEvidence = evidenceQuality(primaryConfidence, firstFinding?.explanation || '', qualityScore);
  const overallStatus = safetyFlags.length > 0 || overallEvidence === 'limited'
    ? 'qualified'
    : primaryConfidence < 45 ? 'unable_to_determine' : 'supported';

  return {
    ...source,
    conditions: findings,
    primary_condition: primary,
    confidence_score: primaryConfidence,
    severity: severity(source.severity),
    triage_level: triage(source.triage_level, scope),
    safety_flags: [...new Set(safetyFlags)],
    evidence_quality: overallEvidence,
    analysis_status: overallStatus,
  };
}

export function qualityScoreFromCaptureInfo(captureInfo: unknown) {
  if (!captureInfo || typeof captureInfo !== 'object') return undefined;
  const rows = Array.isArray((captureInfo as Record<string, unknown>).quality_scores)
    ? (captureInfo as Record<string, unknown>).quality_scores as Array<Record<string, unknown>>
    : [];
  const scores = rows
    .map((row) => row.scan_quality && typeof row.scan_quality === 'object' ? Number((row.scan_quality as Record<string, unknown>).score) : NaN)
    .filter(Number.isFinite);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : undefined;
}
