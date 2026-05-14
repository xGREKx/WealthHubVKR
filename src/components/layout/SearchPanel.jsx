import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { INDUSTRIES, RISK_META, ATTRACT_META, SITE_SECTIONS, PROJECT_TYPES } from '../../data/constants.js';
import { formatRub } from '../../utils/format.js';

export default function SearchPanel({ open, projects, onSelectProject, onSelectSection, onClose }) {
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Управление монтированием для анимации
  useEffect(() => {
    if (open) {
      setMounted(true);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setQuery('');
      const t = setTimeout(() => setMounted(false), 300); // ждём окончания transition
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)
          && !e.target.closest('#search-trigger')) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const projectMatches = useMemo(() => {
    const active = (projects || []).filter((p) => p.status === 'active');
    if (!q) return active.slice(0, 4);
    return active
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.slogan || '').toLowerCase().includes(q) ||
        (INDUSTRIES.find((i) => i.id === p.industry)?.label || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [q, projects]);

  const sectionMatches = useMemo(() => {
    if (!q) return SITE_SECTIONS;
    return SITE_SECTIONS.filter((s) => s.title.toLowerCase().includes(q));
  }, [q]);

  if (!mounted && !open) return null;

  return (
    <>
      {/* Тонкий backdrop под шапкой */}
      <div
        className={`fixed inset-x-0 z-30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: '60px', bottom: 0, background: 'rgba(5,4,11,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Панель — прижата к правому краю под шапкой, прямо под кнопкой "Поиск" */}
      <div
        ref={panelRef}
        className={`fixed z-40 transition-all ease-out ${
          open
            ? 'opacity-100 translate-y-0 duration-300'
            : 'opacity-0 -translate-y-3 pointer-events-none duration-200'
        }`}
        style={{
          top:   '60px',
          right: '20px',
          width: 'min(640px, calc(100vw - 40px))',
          transformOrigin: 'top right',
        }}
      >
        <div className="bg-white border border-ink shadow-2xl mt-1">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
            <Search size={20} className="text-ink" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск проектов и разделов..."
              className="flex-1 text-base outline-none bg-transparent placeholder:text-muted"
            />
            <button onClick={onClose} className="text-muted hover:text-ink">
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {projectMatches.length > 0 && (
              <div className="px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">
                  Предложения
                </div>
                <div className="space-y-2">
                  {projectMatches.map((p) => {
                    const typeLabel = PROJECT_TYPES.find((t) => t.id === p.type)?.label || '';
                    return (
                      <button
                        key={p.id}
                        onClick={() => { onSelectProject(p); onClose(); }}
                        className="w-full text-left flex items-start justify-between gap-4 px-3 py-3 hover:bg-paper-2 border border-transparent hover:border-line transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink">
                            {typeLabel} «{p.name}»
                          </div>
                          <div className="text-xs text-muted mt-0.5 truncate">{p.slogan}</div>
                          <div className="text-xs text-ink mt-1 font-mono">
                            Цель: {formatRub(p.goal)} р. · Собрано: {formatRub(p.raised)}
                          </div>
                        </div>
                        <div className="text-right text-[11px] flex-shrink-0">
                          <div className="text-ink"><span className="text-muted">Риск:</span> {RISK_META[p.risk]?.label || '—'}</div>
                          <div className="text-ink"><span className="text-muted">Привлекательность:</span> {ATTRACT_META[p.attractiveness] || '—'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-line" />

            <div className="px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">
                Разделы сайта
              </div>
              <div className="space-y-1">
                {sectionMatches.length === 0 && (
                  <div className="text-sm text-muted py-2">Ничего не найдено</div>
                )}
                {sectionMatches.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onSelectSection(s.id); onClose(); }}
                    className="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-paper-2 transition-colors"
                  >
                    <span className="font-medium text-ink">{s.title}</span>
                    <ChevronRight size={16} className="text-muted" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-line flex items-center justify-between text-[11px] text-muted">
            <span>Нажмите <span className="font-mono bg-paper px-1.5 py-0.5">Esc</span> чтобы закрыть</span>
            <span>{projectMatches.length + sectionMatches.length} результатов</span>
          </div>
        </div>
      </div>
    </>
  );
}
