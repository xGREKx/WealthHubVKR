import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { formatRub, pct } from '../../utils/format.js';

const colorFor = (row, col) => {
  const score = (row + col) / 2;
  if (score < 1)   return '#7BBF6A';
  if (score < 2)   return '#C7D958';
  if (score < 2.5) return '#F2DC4F';
  if (score < 3.2) return '#F0A040';
  return '#D85040';
};

export default function RiskHeatmap({ projects = [] }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const pointFor = (p) => {
    const ret = Number(p.expected_return) || 0;
    const x = Math.min(95, Math.max(5, (ret / 35) * 100));
    const y = p.risk === 'high'   ? 15
            : p.risk === 'medium' ? 50
            : p.risk === 'low'    ? 85
            : 50;
    return { x, y };
  };

  const hoverProject = hoverIdx !== null ? projects[hoverIdx] : null;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center justify-between py-2" style={{ width: 24 }}>
        <ArrowUpRight size={14} className="text-ink rotate-[-45deg]" />
        <div
          className="text-[10px] uppercase tracking-[0.2em] font-semibold text-ink"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Риск
        </div>
        <div className="h-2" />
      </div>

      <div className="flex-1">
        <div className="relative grid grid-cols-5 gap-[2px]">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((__, col) => {
              const cellRow = 4 - row;
              return (
                <div
                  key={`${row}-${col}`}
                  className="aspect-square"
                  style={{ background: colorFor(cellRow, col) }}
                />
              );
            })
          )}

          <div className="absolute inset-0">
            {projects.map((p, idx) => {
              const { x, y } = pointFor(p);
              return (
                <div
                  key={p.id || idx}
                  className="absolute w-3 h-3 rounded-full bg-ink border-2 border-white shadow-[0_0_0_1px_#05040B] hover:scale-150 transition-transform cursor-pointer"
                  style={{
                    left: `${x}%`, top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={(e) => {
                    setHoverIdx(idx);
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-3">
          <ArrowRight size={14} className="text-ink" />
          <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-ink">
            Доходность
          </div>
        </div>

        {projects.length === 0 && (
          <div className="text-center text-xs text-muted mt-3">
            Нет проектов в портфеле
          </div>
        )}
      </div>

      {hoverProject && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 80 }}
        >
          <div className="bg-ink text-white text-xs px-3 py-2 shadow-xl border border-orange/30 max-w-[260px]">
            <div className="font-semibold mb-1">{hoverProject.name}</div>
            {hoverProject.slogan && (
              <div className="text-[11px] text-white/80 italic mb-1">{hoverProject.slogan}</div>
            )}
            <div className="text-[10px] text-white/60 grid grid-cols-2 gap-x-2">
              <span>Цель:</span>          <span className="font-mono text-right">{formatRub(hoverProject.goal)} ₽</span>
              <span>Собрано:</span>       <span className="font-mono text-right">{pct(hoverProject.raised, hoverProject.goal).toFixed(0)}%</span>
              <span>Доходность:</span>    <span className="font-mono text-right">{hoverProject.expected_return}%</span>
              <span>Риск:</span>          <span className="font-mono text-right">{hoverProject.risk}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
