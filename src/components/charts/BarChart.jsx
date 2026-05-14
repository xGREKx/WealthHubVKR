import { useState } from 'react';
import { shortRub, formatRub } from '../../utils/format.js';

export default function BarChart({
  data,
  height = 200,
  color = '#5F2F8C',
  formatY = shortRub,
  formatTooltip,
  emptyMessage = 'Нет данных',
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const normalized = (data || []).map((d) => ({
    ...d,
    value: Number(d.value) || 0,
  }));

  const w   = 100;
  const max = Math.max(1, ...normalized.map((d) => d.value)) * 1.15;
  const allZero = normalized.length === 0 || normalized.every((d) => d.value === 0);

  if (normalized.length === 0) {
    return <div className="text-center text-sm text-muted py-12">{emptyMessage}</div>;
  }

  const barW = (w / normalized.length) * 0.55;
  const gap  = w / normalized.length;
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const hoverData = hoverIdx !== null ? normalized[hoverIdx] : null;

  return (
    <div className="flex gap-3 w-full relative">
      <div className="flex flex-col justify-between text-[10px] text-muted font-mono py-1 pr-1" style={{ height }}>
        {ticks.map((t, i) => <div key={i}>{formatY(t)}</div>)}
      </div>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = (height - 24) * p + 4;
            return <line key={i} x1="0" x2={w} y1={y} y2={y} stroke="#E0DDD8" strokeWidth="0.15" />;
          })}
          {normalized.map((d, i) => {
            const bh = (d.value / max) * (height - 30);
            const x = i * gap + (gap - barW) / 2;
            const y = height - 22 - bh;
            const isHover = hoverIdx === i;
            return (
              <rect
                key={i}
                x={x} y={y} width={barW} height={Math.max(0, bh)}
                fill={isHover ? '#F07220' : color}
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoverIdx(null)}
              />
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
        <div className="flex justify-around -mt-5 px-1">
          {normalized.map((d, i) => (
            <div key={i} className="text-xs text-muted font-medium">{d.label || d.q}</div>
          ))}
        </div>
      </div>

      {hoverData && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 50 }}
        >
          <div className="bg-ink text-white text-xs px-3 py-2 shadow-xl border border-orange/30">
            <div className="font-semibold mb-0.5">{hoverData.label || hoverData.q}</div>
            <div className="font-mono text-[11px] text-white/80">
              {formatTooltip ? formatTooltip(hoverData) : `${formatRub(hoverData.value)} ₽`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
