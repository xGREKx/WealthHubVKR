export default function SectionTitle({ kicker, title, className = '' }) {
  return (
    <div className={className}>
      {kicker && (
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-medium mb-2">
          {kicker}
        </div>
      )}
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink">{title}</h2>
    </div>
  );
}
