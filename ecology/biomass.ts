const round = (value: number, decimals = 3): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
};

const DEFAULT_WOOD_DENSITY_G_CM3 = 0.60;

const estimateDbhFromHeightM = (heightM: number): number => {
  // Aproksimasi DBH dari tinggi untuk data lapangan cepat (tanpa ukur diameter langsung).
  // Bentuk eksponensial menjaga nilai bibit tetap realistis dan tidak meledak pada pohon tinggi.
  if (!Number.isFinite(heightM) || heightM <= 0) {
    return 0;
  }

  if (heightM <= 1.3) {
    return Math.max(0.5, heightM * 0.85);
  }

  return Math.max(1, 0.85 * heightM ** 1.2);
};

export const estimateBiomass = (heightCm: number, woodDensity = DEFAULT_WOOD_DENSITY_G_CM3): number => {
  const safeHeightCm = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 0;
  if (safeHeightCm === 0) {
    return 0;
  }

  const h = safeHeightCm / 100; // meter
  const rho = Number.isFinite(woodDensity) && woodDensity > 0 ? woodDensity : DEFAULT_WOOD_DENSITY_G_CM3;
  const d = estimateDbhFromHeightM(h); // cm

  // Persamaan allometrik umum tropis (gaya Chave 2014):
  // AGB(kg) = 0.0673 * (rho * D^2 * H)^0.976
  // Catatan: D diestimasi dari H karena diameter belum tersedia pada alur capture saat ini.
  const agb = 0.0673 * (rho * d * d * h) ** 0.976;

  return round(Math.max(0, agb));
};
