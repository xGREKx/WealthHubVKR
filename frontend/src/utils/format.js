export const formatRub = (n) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

export const shortRub = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + ' млн';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' тыс';
  return formatRub(n);
};

export const pct = (raised, goal) =>
  goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
