import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, RotateCcw, MapPin, TrendingUp, Calendar, ArrowRight, Star, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { INDUSTRIES, PROJECT_TYPES, ATTRACT_META } from '../data/constants.js';
import { formatRub, pct } from '../utils/format.js';

const EMPTY_FILTERS = {
  industries: [],
  types: [],
  risks: [],
  attractiveness: [],
  geography: '',
  minGoal: '',
  maxGoal: '',
  minReturn: '',
  maxReturn: '',
  minProgress: '',
  maxDays: '',
  search: '',
};

const PAGE_SIZE_OPTIONS = [9, 18, 36];

export default function MarketplacePage({ projects, loading, onOpenProject }) {
  const [draft, setDraft]   = useState(EMPTY_FILTERS);
  const [active, setActive] = useState(EMPTY_FILTERS);
  const [sort, setSort]     = useState('promoted');

  const [page, setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const toggleArr = (key, val) => {
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((x) => x !== val) : [...d[key], val],
    }));
  };

  const apply = () => { setActive({ ...draft }); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setActive(EMPTY_FILTERS); setPage(1); };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (p.status !== 'active') return false;
      if (active.industries.length     && !active.industries.includes(p.industry))         return false;
      if (active.types.length          && !active.types.includes(p.type))                  return false;
      if (active.risks.length          && !active.risks.includes(p.risk))                  return false;
      if (active.attractiveness.length && !active.attractiveness.includes(p.attractiveness)) return false;
      if (active.geography             && !p.geography.toLowerCase().includes(active.geography.toLowerCase())) return false;
      if (active.minGoal      && +p.goal           < +active.minGoal)     return false;
      if (active.maxGoal      && +p.goal           > +active.maxGoal)     return false;
      if (active.minReturn    && +p.expected_return < +active.minReturn)  return false;
      if (active.maxReturn    && +p.expected_return > +active.maxReturn)  return false;
      if (active.minProgress  && pct(p.raised, p.goal) < +active.minProgress) return false;
      if (active.search) {
        const q = active.search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.slogan?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [projects, active]);

  const sorted = useMemo(() => {
    const s = [...filtered];
    if (sort === 'promoted') {
      // Порядок: оплаченные → рекомендованные системой → по прогрессу
      s.sort((a, b) => {
        if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
        if (!!a.is_recommended !== !!b.is_recommended) return a.is_recommended ? -1 : 1;
        return pct(b.raised, b.goal) - pct(a.raised, a.goal);
      });
    }
    if (sort === 'progress')   s.sort((a, b) => pct(b.raised, b.goal) - pct(a.raised, a.goal));
    if (sort === 'return')     s.sort((a, b) => +b.expected_return - +a.expected_return);
    if (sort === 'goal_desc')  s.sort((a, b) => +b.goal - +a.goal);
    if (sort === 'goal_asc')   s.sort((a, b) => +a.goal - +b.goal);
    if (sort === 'newest')     s.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return s;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageItems = sorted.slice(pageStart, pageStart + pageSize);

  // При смене размера страницы — корректируем номер
  useEffect(() => { setPage(1); }, [pageSize, sort]);

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
            Витрина проектов · {sorted.length} {pluralize(sorted.length, ['предложение', 'предложения', 'предложений'])}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            Найдите проект, который<br />будет работать для вас.
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Поиск по названию"
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              className="pl-9 pr-4 py-2 bg-white border border-line text-sm w-56 focus:outline-none focus:border-ink"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-white border border-line text-sm focus:outline-none focus:border-ink cursor-pointer"
          >
            <option value="promoted">Сначала рекомендуемые</option>
            <option value="progress">По прогрессу сбора</option>
            <option value="return">Высокая доходность</option>
            <option value="goal_desc">Сначала крупные цели</option>
            <option value="goal_asc">Сначала небольшие цели</option>
            <option value="newest">Сначала новые</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(+e.target.value)}
            className="px-3 py-2 bg-white border border-line text-sm focus:outline-none focus:border-ink cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} на странице</option>)}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bg-white border border-line p-5 h-fit lg:sticky lg:top-[80px]">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-line">
            <Filter size={16} className="text-ink" />
            <span className="font-display text-base font-semibold text-ink">Фильтры</span>
          </div>

          <FilterGroup label="Отрасль">
            <div className="space-y-1.5">
              {INDUSTRIES.map((ind) => (
                <Check2 key={ind.id} checked={draft.industries.includes(ind.id)}
                        onChange={() => toggleArr('industries', ind.id)} label={ind.label} />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Тип проекта">
            <div className="space-y-1.5">
              {PROJECT_TYPES.map((t) => (
                <Check2 key={t.id} checked={draft.types.includes(t.id)}
                        onChange={() => toggleArr('types', t.id)} label={t.label} />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Уровень риска">
            <div className="space-y-1.5">
              <Check2 checked={draft.risks.includes('low')}    onChange={() => toggleArr('risks', 'low')}    label="Низкий" />
              <Check2 checked={draft.risks.includes('medium')} onChange={() => toggleArr('risks', 'medium')} label="Средний" />
              <Check2 checked={draft.risks.includes('high')}   onChange={() => toggleArr('risks', 'high')}   label="Высокий" />
            </div>
          </FilterGroup>

          <FilterGroup label="Привлекательность">
            <div className="space-y-1.5">
              <Check2 checked={draft.attractiveness.includes('low')}    onChange={() => toggleArr('attractiveness', 'low')}    label="Низкая" />
              <Check2 checked={draft.attractiveness.includes('medium')} onChange={() => toggleArr('attractiveness', 'medium')} label="Средняя" />
              <Check2 checked={draft.attractiveness.includes('high')}   onChange={() => toggleArr('attractiveness', 'high')}   label="Высокая" />
            </div>
          </FilterGroup>

          <FilterGroup label="География">
            <input
              type="text"
              placeholder="Город / регион"
              value={draft.geography}
              onChange={(e) => setDraft({ ...draft, geography: e.target.value })}
              className="w-full px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink"
            />
          </FilterGroup>

          <FilterGroup label="Цель сбора, ₽">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="от" value={draft.minGoal}
                     onChange={(e) => setDraft({ ...draft, minGoal: e.target.value })}
                     className="px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink" />
              <input type="number" placeholder="до" value={draft.maxGoal}
                     onChange={(e) => setDraft({ ...draft, maxGoal: e.target.value })}
                     className="px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink" />
            </div>
          </FilterGroup>

          <FilterGroup label="Доходность, %">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="от" value={draft.minReturn}
                     onChange={(e) => setDraft({ ...draft, minReturn: e.target.value })}
                     className="px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink" />
              <input type="number" placeholder="до" value={draft.maxReturn}
                     onChange={(e) => setDraft({ ...draft, maxReturn: e.target.value })}
                     className="px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink" />
            </div>
          </FilterGroup>

          <FilterGroup label="Прогресс сбора от, %">
            <input type="number" placeholder="напр., 50" value={draft.minProgress}
                   onChange={(e) => setDraft({ ...draft, minProgress: e.target.value })}
                   className="w-full px-2 py-1.5 bg-paper-2 border border-line text-xs focus:outline-none focus:border-ink" />
          </FilterGroup>

          <div className="space-y-2 pt-2">
            <Button variant="primary" className="w-full" onClick={apply}>
              Применить фильтры
            </Button>
            <Button variant="ghost" className="w-full" icon={RotateCcw} onClick={reset}>
              Сбросить
            </Button>
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="bg-white border border-line p-12 text-center text-muted">
              Загрузка проектов...
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white border border-line p-12 text-center">
              <div className="font-display text-xl font-semibold text-ink mb-2">
                Ничего не найдено
              </div>
              <div className="text-muted text-sm mb-5">
                Попробуйте изменить фильтры или сбросить их
              </div>
              <Button variant="outline" onClick={reset}>Сбросить фильтры</Button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {pageItems.map((p) => (
                  <ProjectCard key={p.id} project={p} onClick={() => onOpenProject(p)} />
                ))}
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="mb-5 pb-5 border-b border-line-soft last:border-b-0">
      <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2.5">{label}</div>
      {children}
    </div>
  );
}

function Check2({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-ink hover:text-orange transition-colors">
      <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
        checked ? 'bg-ink border-ink' : 'bg-white border-line'
      }`}>
        {checked && <span className="w-2 h-2 bg-orange" />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span>{label}</span>
    </label>
  );
}

function ProjectCard({ project, onClick }) {
  const industry = INDUSTRIES.find((i) => i.id === project.industry)?.label;
  // Карточка выделяется акцентной рамкой в двух случаях:
  //   1) проект продвигается (paid promotion) — оранжевая;
  //   2) проект рекомендован системой текущему инвестору — фиолетовая.
  const isPromoted    = project.promoted;
  const isRecommended = project.is_recommended;
  const isHighlighted = isPromoted || isRecommended;

  let borderClass;
  let topBarClass;
  if (isPromoted) {
    borderClass = 'border-orange/50 shadow-[0_0_0_1px_rgba(240,114,32,0.2)] hover:border-orange';
    topBarClass = 'bg-gradient-to-r from-orange to-violet';
  } else if (isRecommended) {
    borderClass = 'border-violet/60 shadow-[0_0_0_1px_rgba(124,58,237,0.18)] hover:border-violet';
    topBarClass = 'bg-violet';
  } else {
    borderClass = 'border-line hover:border-ink';
    topBarClass = '';
  }

  return (
    <button
      onClick={onClick}
      className={`group bg-white border transition-all text-left flex flex-col relative ${borderClass}`}
    >
      {isHighlighted && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${topBarClass}`} />
      )}
      {isRecommended && !isPromoted && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-violet text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1">
          <Sparkles size={10} /> рекомендуем
        </div>
      )}

      <div className="p-5 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            {industry}
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold text-ink leading-tight mb-2 group-hover:text-orange transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-muted leading-snug mb-4 line-clamp-2 italic">{project.slogan}</p>

        <div className="flex items-center gap-2 text-[11px] text-muted mb-3">
          <MapPin size={11} /> {project.geography}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <RiskBadge risk={project.risk} />
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            project.attractiveness === 'high'
              ? 'bg-violet text-white'
              : 'bg-paper text-ink'
          }`}>
            {ATTRACT_META[project.attractiveness]}
          </span>
        </div>
      </div>

      <div className="border-t border-line p-5 bg-paper-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-xs uppercase tracking-wider text-muted">Собрано</div>
          <div className="font-mono font-semibold text-ink text-sm">
            {pct(project.raised, project.goal).toFixed(0)}%
          </div>
        </div>
        <div className="font-display text-base font-semibold text-ink mb-1">
          {formatRub(project.raised)} <span className="text-muted text-xs">из {formatRub(project.goal)} ₽</span>
        </div>
        <ProgressBar value={pct(project.raised, project.goal)} height={4} />

        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="flex items-center gap-1 text-violet font-semibold">
            <TrendingUp size={12} /> {project.expected_return}% / год
          </span>
          <span className="flex items-center gap-1 text-ink group-hover:translate-x-0.5 transition-transform">
            Подробнее <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  // показываем максимум 7 страниц с многоточиями
  const visible = pages.length <= 7
    ? pages
    : page <= 4
      ? [...pages.slice(0, 5), '...', totalPages]
      : page >= totalPages - 3
        ? [1, '...', ...pages.slice(totalPages - 5)]
        : [1, '...', page - 1, page, page + 1, '...', totalPages];

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-10 h-10 bg-white border border-line hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center"
      >
        <ChevronLeft size={16} />
      </button>
      {visible.map((p, i) => (
        p === '...'
          ? <span key={i} className="px-2 text-muted">...</span>
          : <button
              key={i}
              onClick={() => onChange(p)}
              className={`w-10 h-10 text-sm font-semibold transition-colors ${
                p === page ? 'bg-ink text-white' : 'bg-white border border-line hover:bg-paper-2'
              }`}
            >
              {p}
            </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-10 h-10 bg-white border border-line hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function pluralize(n, forms) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
