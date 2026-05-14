import { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.jsx';
import { faqApi } from '../api/client.js';

const CATEGORY_LABELS = {
  general:    'Общее',
  investment: 'Инвестирование',
  payment:    'Платежи',
  account:    'Учётная запись',
  security:   'Безопасность',
};

export default function FAQPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    faqApi.list()
      .then((data) => setEntries(data.results || data))
      .catch((e) => showToast(e.message || 'Не удалось загрузить FAQ', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const filtered = activeCategory === 'all'
    ? entries
    : entries.filter((e) => e.category === activeCategory);

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Wealth Hub · Справка
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-3">
        Часто задаваемые вопросы
      </h1>
      <p className="text-muted mb-8 max-w-2xl">
        Здесь собраны ответы на самые популярные вопросы о платформе. Если не нашли нужного —
        напишите в раздел «Поддержка» или на support@wealthhub.ru.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeCategory === c
                ? 'bg-ink text-white'
                : 'bg-white border border-line text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {c === 'all' ? 'Все' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted text-sm">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center">
          <HelpCircle size={32} className="mx-auto text-muted mb-3" />
          <div className="text-muted text-sm">В этой категории пока нет вопросов</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => <FAQItem key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}

function FAQItem({ entry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-line">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-paper-2 transition-colors"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">
            {CATEGORY_LABELS[entry.category]}
          </div>
          <div className="font-semibold text-ink">{entry.question}</div>
        </div>
        <ChevronDown
          size={18}
          className={`text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-line-soft anim-fade-in">
          <div className="text-sm text-ink leading-relaxed whitespace-pre-line">{entry.answer}</div>
        </div>
      )}
    </div>
  );
}
