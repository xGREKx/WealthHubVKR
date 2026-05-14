const COLORS = {
  paper:  'bg-paper text-ink',
  orange: 'bg-orange text-white',
  violet: 'bg-violet text-white',
  dark:   'bg-ink text-white',
  soft_o: 'bg-orange-soft text-ink',
  soft_v: 'bg-violet-soft text-ink',
  white:  'bg-white text-ink border border-line',
};

export default function Pill({ children, color = 'paper', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${COLORS[color]} ${className}`}>
      {children}
    </span>
  );
}
