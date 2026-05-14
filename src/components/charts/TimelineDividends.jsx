import { Calendar, Wallet } from 'lucide-react';
import { formatRub } from '../../utils/format.js';

/**
 * Вертикальный таймлайн ближайших дивидендных выплат.
 * items: [{ project, amount, date }]
 */
export default function TimelineDividends({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        Нет ближайших выплат
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-stretch gap-3">
          {/* Левая колонка с датой */}
          <div className="flex-shrink-0 w-16 text-right pt-1">
            <div className="text-[10px] uppercase tracking-wider text-muted">
              {monthName(it.date)}
            </div>
            <div className="font-display text-xl font-semibold text-ink leading-none">
              {dayPart(it.date)}
            </div>
          </div>

          {/* Линия + точка */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className={`w-3 h-3 mt-2 rounded-full ${i === 0 ? 'bg-orange ring-2 ring-orange/30 ring-offset-2 ring-offset-white' : 'bg-violet'}`} />
            {i < items.length - 1 && <div className="w-px flex-1 bg-line mt-1" />}
          </div>

          {/* Карточка */}
          <div className="flex-1 bg-paper-2 border border-line p-3 hover:border-ink transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm text-ink leading-tight">{it.project}</div>
              {i === 0 && (
                <span className="text-[9px] uppercase tracking-wider font-bold bg-orange text-white px-1.5 py-0.5">
                  Скоро
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-violet">
              <Wallet size={12} />
              <span className="font-mono font-semibold text-sm">+{formatRub(it.amount)} ₽</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Парсинг даты вида "15.05" или ISO
function monthName(date) {
  const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  if (typeof date === 'string' && date.includes('.')) {
    const [, m] = date.split('.');
    return months[+m - 1] || date;
  }
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return months[d.getMonth()];
}

function dayPart(date) {
  if (typeof date === 'string' && date.includes('.')) {
    return date.split('.')[0];
  }
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return d.getDate();
}
