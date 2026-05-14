import { useState } from 'react';
import { formatRub } from '../../utils/format.js';

/**
 * Donut-диаграмма с встроенным tooltip.
 * Tooltip рисуется через <div fixed> в DOM, поэтому SVG-namespace не нарушается.
 */
export default function DonutChart({
  segments,
  size = 180,
  thickness = 28,
  centerLabel,
  centerValue,
  emptyMessage = 'Нет данных',
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Decimal-строки → числа, отбрасываем плейсхолдеры (color=transparent)
  const normalized = (segments || [])
    .filter((s) => s.color !== 'transparent')
    .map((s) => ({
      ...s,
      value: Number(s.value) || 0,
    }));

  const total = normalized.reduce((sum, x) => sum + x.value, 0);
  const allZero = total <= 0;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  if (allZero) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#EAE8E4" strokeWidth={thickness}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
              fontSize="11" fontWeight="600" fill="#6E6B65" fontFamily="Onest">
          {emptyMessage}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
              fontSize="10" fill="#6E6B65" fontFamily="Onest">
          Сделайте первую инвестицию
        </text>
      </svg>
    );
  }

  let acc = 0;
  const hoverSeg = hoverIdx !== null ? normalized[hoverIdx] : null;

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#EAE8E4" strokeWidth={thickness}
          />
          {normalized.map((seg, i) => {
            if (seg.value <= 0) return null;
            const dash = (seg.value / total) * c;
            const isHover = hoverIdx === i;
            const el = (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={seg.color}
                strokeWidth={isHover ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={-acc}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
            acc += dash;
            return el;
          })}
        </g>
        {centerLabel && (
          <text x={size / 2} y={size / 2 - 6} textAnchor="middle"
                fontSize="11" fontWeight="600" fill="#6E6B65" fontFamily="Onest">
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
                fontSize="16" fontWeight="700" fill="#05040B" fontFamily="Unbounded">
            {centerValue}
          </text>
        )}
      </svg>

      {hoverSeg && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 60 }}
        >
          <div className="bg-ink text-white text-xs px-3 py-2 shadow-xl border border-orange/30 max-w-[260px]">
            <div className="font-semibold mb-0.5">{hoverSeg.label}</div>
            <div className="font-mono text-[11px] text-white/80">
              {formatRub(hoverSeg.value)} ₽
            </div>
            <div className="text-[10px] text-white/60 mt-0.5">
              {((hoverSeg.value / total) * 100).toFixed(1)}% от итога
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
