export interface GPSRecord {
  accuracy: number;
}

export interface GPSQuality {
  medianAccuracy: number;
  p90Accuracy: number;
  sampleCount: number;
  quality: 'Tinggi' | 'Sedang' | 'Rendah';
}

const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
};

const classifyGPS = (medianAccuracy: number): GPSQuality['quality'] => {
  if (medianAccuracy < 5) {
    return 'Tinggi';
  }
  if (medianAccuracy <= 10) {
    return 'Sedang';
  }
  return 'Rendah';
};

export const analyzeGPSAccuracy = (records: GPSRecord[]): GPSQuality => {
  const sorted = records
    .map((r) => r.accuracy)
    .filter((v) => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return {
      medianAccuracy: 0,
      p90Accuracy: 0,
      sampleCount: 0,
      quality: 'Rendah',
    };
  }

  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  const iqr = Math.max(0, q3 - q1);
  const upperBound = q3 + 1.5 * iqr;
  const filtered = sorted.filter((value) => value <= upperBound);
  const source = filtered.length > 0 ? filtered : sorted;

  const mid = Math.floor(source.length / 2);
  const medianAccuracy =
    source.length % 2 === 0 ? (source[mid - 1] + source[mid]) / 2 : source[mid];
  const p90Idx = Math.min(source.length - 1, Math.floor((source.length - 1) * 0.9));
  const p90Accuracy = source[p90Idx];

  return {
    medianAccuracy: round(medianAccuracy),
    p90Accuracy: round(p90Accuracy),
    sampleCount: source.length,
    quality: classifyGPS(medianAccuracy),
  };
};
