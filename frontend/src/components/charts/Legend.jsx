import { formatRub } from '../../utils/format.js';

/**
 * Легенда. Сохраняет одинаковую высоту независимо от количества ненулевых сегментов:
 * - сегменты со значением 0 показываются полупрозрачными
 * - сегменты с цветом transparent (placeholder) — невидимая строка для выравнивания
 */
export default function Legend({ items, vertical = true }) {
  return (
    <div className={vertical ? 'space-y-2' : 'flex gap-4 flex-wrap'}>
      {items.map((it, i) => {
        const numVal = Number(it.value) || 0;
        const isPlaceholder = it.color === 'transparent';
        const isZero        = numVal === 0;

        if (isPlaceholder) {
          // Невидимая строка-заполнитель для одинаковой высоты блока
          return <div key={i} className="flex items-center gap-2 text-xs opacity-0">·</div>;
        }

        return (
          <div key={i} className={`flex items-start gap-2 text-xs ${isZero ? 'opacity-50' : ''}`}>
            <span
              className="inline-block w-3 h-3 mt-0.5 flex-shrink-0"
              style={{ background: it.color }}
            />
            <span className="text-ink leading-snug">
              <span className="font-semibold">{it.label}</span>
              {it.value !== undefined && (
                <span className="text-muted">
                  {' — '}
                  {typeof it.value === 'string' && isNaN(numVal)
                    ? it.value
                    : `${formatRub(numVal)} ₽`}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
