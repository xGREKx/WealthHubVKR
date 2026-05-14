import { useState, useEffect, useMemo } from 'react';
import DonutChart from '../components/charts/DonutChart.jsx';
import Legend from '../components/charts/Legend.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import RiskHeatmap from '../components/charts/RiskHeatmap.jsx';
import { formatRub, shortRub } from '../utils/format.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authApi, investApi } from '../api/client.js';

export default function AnalyticsPage({ portfolioVersion = 0 }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading]         = useState(true);
  const [portfolio, setPortfolio]     = useState({ balance: 0, invested: 0, dividends: 0 });
  const [investments, setInvestments] = useState([]);
  const [dividends, setDividends]     = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.allSettled([
      authApi.portfolio(),
      investApi.list(),
      investApi.dividends(),
      investApi.transactions(),
    ]).then((results) => {
      const [p, inv, div, tx] = results;
      if (p.status === 'fulfilled') setPortfolio(p.value);
      if (inv.status === 'fulfilled') setInvestments(inv.value.results || inv.value);
      if (div.status === 'fulfilled') setDividends(div.value.results || div.value);
      if (tx.status === 'fulfilled') setTransactions(tx.value.results || tx.value);

      // Показываем ошибку, только если ВСЁ упало
      const anySuccess = results.some((r) => r.status === 'fulfilled');
      if (!anySuccess) {
        showToast('Не удалось загрузить данные аналитики', 'error');
      }
    }).finally(() => setLoading(false));
  }, [user, portfolioVersion, showToast]);

  // === Распределение по рискам — фиксированная длина ===
  const riskSegments = useMemo(() => {
    const buckets = { low: 0, medium: 0, high: 0 };
    investments.filter((i) => !i.is_sold).forEach((i) => {
      const amt = Number(i.amount) || 0;
      if (i.risk_at_purchase in buckets) buckets[i.risk_at_purchase] += amt;
    });
    return [
      { label: 'Низкий риск',         value: buckets.low,    color: '#5F2F8C' },
      { label: 'Средний риск',        value: buckets.medium, color: '#F0A040' },
      { label: 'Высокий риск',        value: buckets.high,   color: '#F07220' },
      { label: 'Не инвестировано',    value: Number(portfolio.balance) || 0, color: '#7BBF6A' },
    ];
  }, [investments, portfolio]);

  // === Структура по отраслям ===
  const industrySegments = useMemo(() => {
    const map = new Map();
    investments.filter((i) => !i.is_sold).forEach((i) => {
      const ind = i.project?.industry || 'other';
      map.set(ind, (map.get(ind) || 0) + (Number(i.amount) || 0));
    });
    const colors = ['#5F2F8C','#F07220','#F0A040','#7BBF6A','#C7D958','#0066B3','#B23B2C', '#5F8C2F'];
    let ci = 0;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({
        label: industryLabel(k),
        value: v,
        color: colors[ci++ % colors.length],
      }));
  }, [investments]);

  // === Доходность по кварталам (по полученным дивидендам) ===
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

  // === Доходы и расходы за 12 месяцев ===
  const flowsData = useMemo(() => {
    const months = 12;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const exp = Array(months).fill(0);
    const inc = Array(months).fill(0);
    const labels = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      labels.push(d.toLocaleDateString('ru-RU', { month: 'short' }));
    }
    const idx = (date) => {
      const d = new Date(date);
      return (d.getFullYear() - startMonth.getFullYear()) * 12 + (d.getMonth() - startMonth.getMonth());
    };
    transactions.forEach((t) => {
      const i = idx(t.created_at);
      if (i < 0 || i >= months) return;
      const amt = Number(t.amount) || 0;
      if (t.type === 'investment' || t.type === 'withdrawal') exp[i] += amt;
      if (t.type === 'dividend' || t.type === 'sale' || t.type === 'deposit') inc[i] += amt;
    });
    return { exp, inc, labels };
  }, [transactions]);

  // === Только проекты ИЗ ПОРТФЕЛЯ для heatmap ===
  const portfolioProjects = useMemo(() => {
    const seen = new Set();
    return investments
      .filter((i) => !i.is_sold && i.project)
      .filter((i) => {
        if (seen.has(i.project.id)) return false;
        seen.add(i.project.id);
        return true;
      })
      .map((i) => i.project);
  }, [investments]);

  const hasInvestments = investments.length > 0;
  const totalInvested = Number(portfolio.invested) || 0;
  const totalDividends = Number(portfolio.dividends) || 0;

  if (loading) {
    return (
      <div className="px-5 md:px-10 py-12 max-w-7xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
          Аналитика финансов
        </h1>
        <div className="text-muted text-sm">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-[1400px] mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-2">
        Аналитика финансов
      </h1>
      <div className="text-sm text-muted mb-8">
        Все графики построены на основе ваших инвестиций и транзакций.
      </div>

      {/* KPI */}
      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Баланс"         value={`${formatRub(Number(portfolio.balance) || 0)} ₽`} />
        <Kpi label="Вложено"        value={`${formatRub(totalInvested)} ₽`} accent="violet" />
        <Kpi label="Дивиденды"      value={`${formatRub(totalDividends)} ₽`} accent="orange" />
        <Kpi label="Активных позиций" value={portfolioProjects.length} />
      </div>

      {!hasInvestments && (
        <div className="mb-8 bg-orange-tint border-l-4 border-orange p-4 text-sm text-ink">
          У вас пока нет инвестиций — графики покажут реальные данные после первой сделки на витрине проектов.
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="bg-white border border-line p-6 lg:col-span-4">
          <h3 className="font-display text-base font-semibold text-ink mb-4">
            Распределение портфеля по рискам
          </h3>
          <div className="flex flex-col items-center">
            <DonutChart segments={riskSegments} size={200} thickness={32} />
            <div className="mt-5 w-full">
              <Legend items={riskSegments} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-line p-6 lg:col-span-4">
          <h3 className="font-display text-base font-semibold text-ink mb-1">
            Структура активов
          </h3>
          <div className="text-xs text-muted mb-4">По отраслям</div>
          {industrySegments.length === 0 ? (
            <div className="text-center text-sm text-muted py-12">
              Сделайте первую инвестицию
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <DonutChart segments={industrySegments} size={200} thickness={32} />
              <div className="mt-5 w-full">
                <Legend items={industrySegments} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-line p-6 lg:col-span-4">
          <h3 className="font-display text-base font-semibold text-ink mb-4">
            Доходность портфеля
          </h3>
          <div className="text-xs text-muted mb-3">Полученные дивиденды по кварталам</div>
          <BarChart
            data={quarterlyReturns}
            color="#5F2F8C"
            height={200}
            formatY={shortRub}
            formatTooltip={(d) => `${formatRub(d.value)} ₽`}
            emptyMessage="Дивидендов ещё не было"
          />
        </div>

        <div className="bg-white border border-line p-6 lg:col-span-7">
          <h3 className="font-display text-base font-semibold text-ink mb-1">
            Расходы и доходы
          </h3>
          <div className="text-xs text-muted mb-4">За последние 12 месяцев</div>
          <LineChart
            series={[
              { name: 'Расходы (инвестиции, выводы)', color: '#5F2F8C', data: flowsData.exp },
              { name: 'Доходы (дивиденды, пополнения)', color: '#F07220', data: flowsData.inc },
            ]}
            labels={flowsData.labels}
            height={220}
            formatTooltip={(v) => `${formatRub(v)} ₽`}
            emptyMessage="Транзакций ещё не было"
          />
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-violet inline-block" />
              <span className="text-muted">Расходы</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-orange inline-block" />
              <span className="text-muted">Доходы</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-line p-6 lg:col-span-5">
          <h3 className="font-display text-base font-semibold text-ink mb-1">
            Карта рисков вашего портфеля
          </h3>
          <div className="text-xs text-muted mb-4">
            {portfolioProjects.length > 0
              ? 'Точки — проекты, в которые вы инвестировали. Наведите для подробностей.'
              : 'После первой инвестиции здесь появятся точки ваших проектов.'}
          </div>
          <RiskHeatmap projects={portfolioProjects} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  const cls = accent === 'violet' ? 'text-violet' : accent === 'orange' ? 'text-orange' : 'text-ink';
  return (
    <div className="bg-white border border-line p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-xl font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function industryLabel(id) {
  const map = {
    it: 'IT', fintech: 'Финтех', healthcare: 'Здравоохранение',
    education: 'Образование', ecology: 'Экология', manufacturing: 'Производство',
    retail: 'Ритейл', tourism: 'Туризм', other: 'Прочее',
  };
  return map[id] || id;
}
