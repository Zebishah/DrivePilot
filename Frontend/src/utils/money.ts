export function formatCHF(amount: number | null | undefined): string {
  const numeric = Number(amount);
  return Number.isFinite(numeric) ? `CHF ${numeric.toFixed(2)}` : "CHF 0.00";
}
