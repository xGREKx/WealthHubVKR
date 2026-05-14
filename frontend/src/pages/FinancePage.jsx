import { useState, useEffect, useMemo } from 'react';
import {
  Banknote, Eye, Briefcase, ArrowDownRight, Wallet, TrendingUp, X,
  AlertTriangle, ArrowRight, Calendar,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import TimelineDividends from '../components/charts/TimelineDividends.jsx';
import { formatRub, pct } from '../utils/format.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authApi, investApi } from '../api/client.js';

export default function FinancePage({ onNavigate, onOpenProject , portfolioVersion = 0}) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [portfolio, setPortfolio]     = useState({ balance: 0, invested: 0, dividends: 0 });
  const [investments, setInvestments] = useState([]);
  const [dividends, setDividends]     = useState([]);
  const [sellOpen, setSellOpen]       = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      authApi.portfolio(),
      investApi.list(),
      investApi.dividends(),
    ]).then(([p, inv, div]) => {
      setPortfolio(p);
      setInvestments(inv.results || inv);
      setDividends(div.results || div);
    }).catch(() => {});
  }, [user, portfolioVersion]);

  // Группируем инвестиции по проекту
  const groupedInvestments = useMemo(() => {
    const map = new Map();
    investments.forEach((inv) => {
      if (inv.is_sold) return;
      const pid = inv.project?.id || inv.project_id;
      if (!pid) return;
      if (!map.has(pid)) {
        map.set(pid, { project: inv.project, items: [], total: 0 });
      }
      const g = map.get(pid);
      g.items.push(inv);
      g.total += Number(inv.amount) || 0;
    });
    return [...map.values()];
  }, [investments]);

  // Доходность по кварталам — на основе РЕАЛЬНЫХ выплат
  const quarterlyReturns = useMemo(() => {
    const year = new Date().getFullYear();
    const buckets = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    dividends.forEach((d) => {
      if (!d.is_paid) return;
      const dt = new Date(d.paid_at);
      if (dt.getFullYear() !== year) return;
      const q = Math.floor(dt.getMonth() / 3) + 1;
      buckets[`Q${q}`] += Number(d.amount) || 0;
    });
    return Object.entries(buckets).map(([q, v]) => ({ label: q, value: v }));
  }, [dividends]);

  const upcoming = useMemo(() => {
    return dividends
      .filter((d) => !d.is_paid)
      .slice(0, 5)
      .map((d) => ({
        project: d.project_name,
        amount:  Number(d.amount) || 0,
        date:    new Date(d.paid_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      }));
  }, [dividends]);

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
          Управление финансами
        </h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <KpiCard label="Баланс портфеля"      value={`${formatRub(Number(portfolio.balance) || 0)} ₽`}    icon={Wallet}     accent="ink" />
        <KpiCard label="Вложено в проекты"     value={`${formatRub(Number(portfolio.invested) || 0)} ₽`}  icon={Briefcase}  accent="violet" />
        <KpiCard label="Получено дивидендов"   value={`${formatRub(Number(portfolio.dividends) || 0)} ₽`} icon={TrendingUp} accent="orange" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Ваши вложения {investments.length > 0 && `(${investments.length})`}
          </h2>

          {groupedInvestments.length === 0 ? (
            <div className="bg-white border border-line p-8 text-center">
              <div className="text-muted text-sm mb-3">У вас пока нет активных инвестиций</div>
              <Button variant="primary" onClick={() => onNavigate('marketplace')}>
                Перейти к витрине
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedInvestments.map((g) => (
                <InvestmentGroupCard
                  key={g.project.id}
                  group={g}
                  onOpen={() => onOpenProject(g.project)}
                />
              ))}
            </div>
          )}

          <h2 className="font-display text-xl font-semibold text-ink mt-10 mb-4">
            Инструменты
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tool icon={Banknote}        label="Продать свою долю"
                  onClick={() => setSellOpen(true)} disabled={groupedInvestments.length === 0} />
            <Tool icon={Eye}             label="Рекомендации для вложений"
                  onClick={() => { showToast('Скоро будет персональная подборка', 'info'); onNavigate('marketplace'); }} />
            <Tool icon={Briefcase}       label="Анализ портфеля"
                  onClick={() => onNavigate('analytics')} />
            <Tool icon={ArrowDownRight}  label="Вывести средства"
                  onClick={() => onNavigate('withdraw')} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-line p-6">
            <h3 className="font-display text-lg font-semibold text-ink mb-5">
              Доходность портфеля
            </h3>
            <BarChart
              data={quarterlyReturns}
              color="#5F2F8C"
              height={200}
              formatTooltip={(d) => `${formatRub(d.value)} ₽ дивидендов`}
              emptyMessage="Дивидендов ещё не было"
            />
          </div>

          <div className="bg-white border border-line p-6">
            <h3 className="font-display text-lg font-semibold text-ink mb-4">
              Ближайшие выплаты дивидендов
            </h3>
            <TimelineDividends items={upcoming} />
          </div>
        </div>
      </div>

      {sellOpen && (
        <SellShareModal
          investments={investments.filter((i) => !i.is_sold)}
          onClose={() => setSellOpen(false)}
          onSold={() => { setSellOpen(false); showToast('Заявка на продажу принята', 'success'); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }) {
  const colors = {
    ink:    'text-ink',
    violet: 'text-violet',
    orange: 'text-orange',
  };
  return (
    <div className="bg-white border border-line p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
        <Icon size={16} className={colors[accent]} />
      </div>
      <div className={`font-display text-2xl font-semibold mt-1 ${colors[accent]}`}>{value}</div>
    </div>
  );
}

function InvestmentGroupCard({ group, onOpen }) {
  const { project, items, total } = group;
  const multiple = items.length > 1;

  return (
    <div className="bg-white border border-line p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="font-display text-lg font-semibold text-ink">{project.name}</div>
          <div className="text-xs text-muted italic mt-0.5">{project.slogan}</div>
        </div>
        <button
          onClick={onOpen}
          className="text-xs text-violet hover:text-orange flex items-center gap-1 font-semibold uppercase tracking-wider"
        >
          <Eye size={12} /> Открыть
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3 pb-3 border-b border-line-soft">
        <div className="text-muted">
          Цель: <span className="text-ink font-mono">{formatRub(project.goal)} ₽</span>
        </div>
        <div className="text-muted">
          Собрано: <span className="text-ink font-mono">{pct(project.raised, project.goal).toFixed(0)}%</span>
        </div>
        <div className="text-muted">
          Дата закрытия: <span className="text-ink font-mono">{project.closing_date || '—'}</span>
        </div>
        <div className="text-muted">
          Риск: <span className="text-ink">{project.risk === 'low' ? 'Низкий' : project.risk === 'medium' ? 'Средний' : 'Высокий'}</span>
        </div>
      </div>

      {multiple ? (
        <>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-2 font-semibold">
            История ваших инвестиций ({items.length})
          </div>
          <div className="space-y-1.5">
            {items.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 text-sm bg-paper-2 px-3 py-2 border border-line-soft">
                <div className="flex items-center gap-2 text-muted">
                  <Calendar size={12} />
                  <span className="font-mono text-xs">
                    {new Date(inv.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="font-mono font-semibold text-ink">
                  {formatRub(Number(inv.amount) || 0)} ₽
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-line text-sm">
            <span className="text-muted font-semibold">Итого вложено</span>
            <span className="font-display text-lg font-semibold text-violet">
              {formatRub(total)} ₽
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted">
            <Calendar size={12} />
            <span className="font-mono text-xs">
              {new Date(items[0].created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <span className="font-display text-lg font-semibold text-violet">
            {formatRub(total)} ₽
          </span>
        </div>
      )}
    </div>
  );
}

function Tool({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white border border-line p-4 flex flex-col items-center text-center gap-2 hover:border-ink hover:bg-paper-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 bg-paper-2 flex items-center justify-center">
        <Icon size={18} className="text-ink" />
      </div>
      <div className="text-xs text-ink leading-tight">{label}</div>
    </button>
  );
}

function SellShareModal({ investments, onClose, onSold }) {
  const [selectedId, setSelectedId] = useState(investments[0]?.id || null);
  const [agreed, setAgreed] = useState(false);
  const selected = investments.find((i) => i.id === selectedId);
  const selAmount = selected ? Number(selected.amount) || 0 : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <div className="relative bg-white border border-ink w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-white">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">Продажа доли</div>
            <div className="font-display text-lg font-semibold text-ink">Выберите инвестицию для продажи</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-orange-tint border-l-2 border-orange p-4 flex gap-3 text-xs text-ink">
            <AlertTriangle size={18} className="text-orange flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Внимание:</strong> продажа доли возможна только при наличии покупателя
              на вторичном рынке. Платформа удерживает <strong>3% комиссии</strong> с суммы продажи.
              При продаже до истечения 3 лет владения — НДФЛ <strong>13%</strong> с прибыли.
              Цена продажи может отличаться от первоначальной инвестиции.
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
              Ваши доли
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {investments.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`w-full text-left flex items-center justify-between gap-3 p-3 border transition-colors ${
                    selectedId === inv.id
                      ? 'border-ink bg-paper-2'
                      : 'border-line bg-white hover:border-ink/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">{inv.project?.name}</div>
                    <div className="text-xs text-muted">
                      Куплено: {new Date(inv.created_at).toLocaleDateString('ru-RU')} ·
                      Доля: {(Number(inv.share_percent) || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-ink flex-shrink-0">
                    {formatRub(Number(inv.amount) || 0)} ₽
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="bg-paper-2 border border-line p-4 text-sm space-y-1">
              <Row label="Сумма инвестиции" value={`${formatRub(selAmount)} ₽`} />
              <Row label="Доля"             value={`${(Number(selected.share_percent) || 0).toFixed(2)}%`} />
              <Row label="Комиссия (3%)"     value={`-${formatRub(selAmount * 0.03)} ₽`} />
              <Row label="Налог НДФЛ (13%)"  value={`-${formatRub(selAmount * 0.13)} ₽`} />
              <div className="border-t border-line mt-2 pt-2">
                <Row label="К получению" value={`${formatRub(selAmount * 0.84)} ₽`} bold />
              </div>
              <div className="text-[10px] text-muted leading-relaxed mt-2">
                Точная сумма будет рассчитана исходя из рыночной стоимости доли на момент продажи.
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-orange"
            />
            <span className="text-xs text-ink leading-relaxed">
              Я понимаю риски, согласен с комиссией и налоговыми обязательствами,
              ознакомлен с правилами вторичного рынка платформы.
            </span>
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button variant="dark" className="flex-1" disabled={!agreed} onClick={onSold}>
              Выставить на продажу
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold text-ink' : ''}`}>
      <span className={bold ? '' : 'text-muted'}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
