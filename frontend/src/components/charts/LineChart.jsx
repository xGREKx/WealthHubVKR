import { useState } from 'react';

export default function LineChart({ series, labels, height = 200, formatTooltip, emptyMessage = 'Нет данных' }) {
  const [hover, setHover] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const normalized = (series || []).map((s) => ({
    ...s,
    data: (s.data || []).map((v) => Number(v) || 0),
  }));

  if (normalized.length === 0 || normalized[0].data.length === 0) {
    return <div className="text-center text-sm text-muted py-12">{emptyMessage}</div>;
  }

  const w   = 100;
  const all = normalized.flatMap((s) => s.data);
  const max = Math.max(1, ...all) * 1.1;
  const allZero = all.every((v) => v === 0);

  const xs = (i, len) => (i / Math.max(1, len - 1)) * w;
  const ys = (v) => height - 24 - (v / max) * (height - 30) + 4;

  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];

  const hoverPoint = hover ? normalized[hover.si]?.data[hover.i] : null;
  const hoverSeries = hover ? normalized[hover.si] : null;

  return (
    <div className="flex gap-3 w-full">
      <div className="flex flex-col justify-between text-[10px] text-muted font-mono py-1 pr-1" style={{ height }}>
        {yTicks.map((t, i) => <div key={i}>{Math.round(t)}</div>)}
      </div>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = (height - 24) * p + 4;
            return <line key={i} x1="0" x2={w} y1={y} y2={y} stroke="#E0DDD8" strokeWidth="0.15" />;
          })}
          {normalized.map((s, si) => {
            const points = s.data.map((v, i) => `${xs(i, s.data.length)},${ys(v)}`).join(' ');
            return (
              <g key={si}>
                <polyline points={points} fill="none" stroke={s.color}
                          strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
                {s.data.map((v, i) => {
                  const isHover = hover?.si === si && hover?.i === i;
                  return (
                    <circle
                      key={i}
                      cx={xs(i, s.data.length)} cy={ys(v)}
                      r={isHover ? 1.6 : 0.9}
                      fill={s.color}
                      style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                      onMouseEnter={(e) => {
                        setHover({ si, i });
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
        {allZero && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-xs text-muted bg-paper-2 px-3 py-1.5 border border-line-soft">
              {emptyMessage}
            </div>
          </div>
        )}
        <div className="flex justify-between px-1 -mt-5">
          {(labels || normalized[0].data).map((_, i) => (
            <div key={i} className="text-[10px] text-muted font-mono">
              {labels ? labels[i] : i}
            </div>
          ))}
        </div>
      </div>

      {hover && hoverSeries && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 50 }}
        >
          <div className="bg-ink text-white text-xs px-3 py-2 shadow-xl border border-orange/30">
            <div className="font-semibold mb-0.5">{hoverSeries.name}</div>
            <div className="font-mono text-[11px] text-white/80">
              {formatTooltip ? formatTooltip(hoverPoint, hover.i, hoverSeries) : hoverPoint}
            </div>
            {labels && labels[hover.i] && (
              <div className="text-[10px] text-white/60 mt-0.5">{labels[hover.i]}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
