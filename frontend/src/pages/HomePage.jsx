import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, TrendingUp, Star, Flame } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { formatRub, pct } from '../utils/format.js';
import { INDUSTRIES, ATTRACT_META } from '../data/constants.js';

const AUTO_INTERVAL   = 5_000;   // обычное автолистание — 5 сек
const MANUAL_INTERVAL = 15_000;  // после ручного клика — 15 сек

export default function HomePage({ projects, loading, onNavigate, onOpenProject }) {
  const promoted = projects.filter((p) => p.promoted && p.status === 'active');
  const [idx, setIdx] = useState(0);
  const [manuallyChanged, setManuallyChanged] = useState(false);
  const [animDirection, setAnimDirection] = useState('next'); // 'next' | 'prev'
  const timerRef = useRef(null);

  // Сброс автолистания
  const resetTimer = useCallback((manual = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (promoted.length <= 1) return;
    const interval = manual ? MANUAL_INTERVAL : AUTO_INTERVAL;
    timerRef.current = setTimeout(() => {
      setAnimDirection('next');
      setIdx((i) => (i + 1) % promoted.length);
      setManuallyChanged(false);
    }, interval);
  }, [promoted.length]);

  useEffect(() => {
    resetTimer(manuallyChanged);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, manuallyChanged, resetTimer]);

  const goToPrev = () => {
    setAnimDirection('prev');
    setIdx((i) => (i - 1 + promoted.length) % promoted.length);
    setManuallyChanged(true);
  };
  const goToNext = () => {
    setAnimDirection('next');
    setIdx((i) => (i + 1) % promoted.length);
    setManuallyChanged(true);
  };
  const goTo = (n) => {
    setAnimDirection(n > idx ? 'next' : 'prev');
    setIdx(n);
    setManuallyChanged(true);
  };

  const current = promoted[idx];

  return (
    <div className="bg-paper">
      {/* HERO */}
      <section className="px-5 md:px-10 py-12 md:py-20 grid-bg border-b border-line">
        <div className="max-w-5xl">
          <div className="text-[11px] uppercase tracking-[0.3em] text-muted font-semibold mb-5">
            Платформа · Малый и средний бизнес · ФЗ-259
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-ink">
            Wealth Hub —<br />
            ваш надёжный <span className="text-orange">партнёр</span><br />
            на пути к <span className="text-violet">финансовой свободе</span>.
          </h1>
          <p className="mt-8 text-base md:text-lg text-ink-soft max-w-2xl leading-relaxed">
            Мы создаём инновационные решения для управления финансами, объединяя
            передовые технологии и экспертный анализ.
          </p>
          <div className="mt-6 max-w-2xl border-l-2 border-orange pl-5 py-1">
            <div className="text-[11px] uppercase tracking-[0.25em] text-orange font-semibold mb-1">Наша миссия</div>
            <p className="text-base md:text-lg text-ink leading-relaxed">
              сделать путь к финансовой независимости доступным каждому. Мы помогаем
              пользователям эффективно управлять капиталом, инвестировать с умом и
              достигать поставленных целей.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" iconRight={ArrowRight} onClick={() => onNavigate('marketplace')}>
              Перейти к витрине
            </Button>
            <Button variant="outline" size="lg" onClick={() => onNavigate('marketplace')}>
              Все предложения
            </Button>
          </div>
        </div>
      </section>

      {/* ГОРЯЧИЕ ПРЕДЛОЖЕНИЯ */}
      {loading ? (
        <section className="px-5 md:px-10 py-12">
          <div className="max-w-7xl mx-auto text-muted text-sm">Загрузка предложений...</div>
        </section>
      ) : promoted.length === 0 ? null : (
        <section className="px-5 md:px-10 py-12 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2 flex items-center gap-2">
                  <Flame size={12} className="text-orange" />
                  Подборка редакции
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink">
                  Горячие <span className="text-orange">предложения</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrev}
                  className="w-10 h-10 bg-white border border-line hover:bg-paper-2 flex items-center justify-center transition-colors"
                  aria-label="Предыдущее"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToNext}
                  className="w-10 h-10 bg-ink text-white hover:bg-ink-soft flex items-center justify-center transition-colors"
                  aria-label="Следующее"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Слайд */}
            <div className="relative overflow-hidden">
              <div
                key={current?.id}
                className={`anim-slide-${animDirection}`}
              >
                {current && <SlideCard project={current} onOpen={() => onOpenProject(current)} />}
              </div>
            </div>

            {/* Точки + прогресс таймера */}
            <div className="flex flex-col items-center gap-3 mt-6">
              <div className="flex justify-center gap-1.5">
                {promoted.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-1 transition-all ${i === idx ? 'w-8 bg-ink' : 'w-2 bg-line'}`}
                    aria-label={`К предложению ${i + 1}`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-muted font-mono">
                {manuallyChanged
                  ? `${idx + 1} / ${promoted.length} · автолистание через 15 сек`
                  : `${idx + 1} / ${promoted.length}`}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Анимация слайдов */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .anim-slide-next { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-slide-prev { animation: slideInLeft  0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
}

function SlideCard({ project, onOpen }) {
  const industry = INDUSTRIES.find((i) => i.id === project.industry)?.label;

  return (
    <div className="bg-white border border-line grid lg:grid-cols-[1.2fr_1fr] relative">
      {/* Тонкая рамка-акцент сверху, как мягкая подсветка промо */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange via-orange to-violet" />

      {/* Левая часть */}
      <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-line">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <RiskBadge risk={project.risk} />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider bg-violet text-white">
            <Star size={11} /> {ATTRACT_META[project.attractiveness]}
          </span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
          {industry} · {project.geography}
        </div>
        <h3 className="font-display text-3xl md:text-5xl font-semibold leading-[1.05] text-ink">
          {project.name}
        </h3>
        <p className="mt-4 text-lg text-ink-soft leading-snug italic">{project.slogan}</p>

        <Button
          className="mt-8"
          variant="dark"
          size="lg"
          iconRight={ArrowRight}
          onClick={onOpen}
        >
          Открыть предложение
        </Button>
      </div>

      {/* Правая часть — метрики */}
      <div className="p-8 md:p-12 bg-paper-2">
        <div className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Цель сбора</div>
            <div className="font-display text-3xl md:text-4xl font-semibold text-ink">
              {formatRub(project.goal)} ₽
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-xs uppercase tracking-wider text-muted">Собрано</div>
              <div className="font-mono font-semibold text-ink">
                {pct(project.raised, project.goal).toFixed(1)}%
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-ink mb-2">
              {formatRub(project.raised)} ₽
            </div>
            <ProgressBar value={pct(project.raised, project.goal)} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="border-t border-line pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Доходность</div>
              <div className="font-display text-lg font-semibold text-violet flex items-center gap-1">
                <TrendingUp size={16} /> {project.expected_return}%
              </div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Окупаемость</div>
              <div className="font-display text-lg font-semibold text-ink">
                {project.payback_years} г.
              </div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Минимум</div>
              <div className="font-display text-lg font-semibold text-ink">
                {formatRub(project.min_investment)} ₽
              </div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Дата закрытия</div>
              <div className="font-display text-lg font-semibold text-orange">
                {project.closing_date || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
