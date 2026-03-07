const round = (value: number, decimals = 3): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
};

export const estimateCarbon = (biomass: number, carbonFraction = 0.47): number => {
  const safeBiomass = Number.isFinite(biomass) && biomass > 0 ? biomass : 0;
  const cf = Number.isFinite(carbonFraction) ? Math.min(0.5, Math.max(0.45, carbonFraction)) : 0.47;
  return round(safeBiomass * cf);
};
