import { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Calendar, TrendingUp, Users, FileText, Download,
  Building2, Target, Layers, AlertTriangle, ShieldCheck, Check, Lock, X,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Field from '../components/ui/Field.jsx';
import { INDUSTRIES, PROJECT_TYPES, ATTRACT_META } from '../data/constants.js';
import { formatRub, pct } from '../utils/format.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { projectsApi, authApi, investApi, mediaUrl } from '../api/client.js';

export default function ProjectDetailPage({ projectId, onBack, onInvested }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [project, setProject]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [investOpen, setInvestOpen] = useState(false);
  const [portfolio, setPortfolio] = useState({ balance: 0 });

  const reload = () => {
    projectsApi.get(projectId)
      .then(setProject)
      .catch((e) => showToast(e.message || 'Не удалось загрузить', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    reload();
    if (user?.role === 'investor') {
      authApi.portfolio().then(setPortfolio).catch(() => {});
    }
  }, [projectId, user?.id]); // eslint-disable-line

  if (loading) {
    return <div className="px-5 md:px-10 py-12 max-w-6xl mx-auto text-muted text-sm">Загрузка проекта...</div>;
  }
  if (!project) return null;

  const industry = INDUSTRIES.find((i) => i.id === project.industry)?.label;
  const type     = PROJECT_TYPES.find((t) => t.id === project.type)?.label;

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-6xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6 transition-colors">
        <ArrowLeft size={16} /> Назад
      </button>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
            {industry} · {type} · {project.geography || '—'}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink">
            {project.name}
          </h1>
          <p className="mt-4 text-lg text-ink-soft italic">{project.slogan}</p>

          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <RiskBadge risk={project.risk} />
            {project.attractiveness && (
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-violet text-white">
                Привлекательность: {ATTRACT_META[project.attractiveness]}
              </span>
            )}
          </div>

          {project.cover_url && (
            <div className="mt-6">
              <img src={mediaUrl(project.cover_url)} alt="" className="w-full max-h-80 object-cover border border-line" />
            </div>
          )}

          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold text-ink mb-3">О проекте</h2>
            <p className="text-ink leading-relaxed whitespace-pre-line">{project.description}</p>
          </div>

          {project.team && project.team.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                <Users size={20} /> Команда проекта
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {project.team.map((m) => (
                  <div key={m.id || m.name} className="bg-white border border-line p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-orange-soft flex-shrink-0 flex items-center justify-center font-display font-bold text-ink">
                        {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm">{m.name}</div>
                        <div className="text-[11px] uppercase tracking-wider text-violet font-semibold mb-1">{m.role}</div>
                        <div className="text-xs text-muted leading-snug">{m.bio}</div>
                        {m.cv_url && (
                          <a href={mediaUrl(m.cv_url)} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 mt-2 text-[11px] text-violet hover:text-orange font-semibold uppercase tracking-wider">
                            <FileText size={11} /> Посмотреть CV
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.documents && project.documents.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                <FileText size={20} /> Документы
              </h2>
              <div className="space-y-2">
                {project.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 bg-white border border-line p-3">
                    <div className="w-9 h-9 bg-paper-2 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-ink truncate">{d.name}</div>
                      <div className="text-[11px] text-muted uppercase tracking-wider">
                        {(d.size_bytes / 1024 / 1024).toFixed(1)} МБ
                      </div>
                    </div>
                    {d.file_url && (
                      <a href={mediaUrl(d.file_url)} target="_blank" rel="noopener noreferrer">
                        <Button variant="light" size="sm" icon={Download}>Скачать</Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.full_content && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4">Подробно</h2>
              <div
                className="bg-white border border-line p-6 prose-content text-ink leading-relaxed"
                dangerouslySetInnerHTML={{ __html: project.full_content }}
              />
            </div>
          )}

          <div className="mt-10 bg-orange-tint border-l-2 border-orange p-4 flex gap-3">
            <AlertTriangle size={18} className="text-orange flex-shrink-0 mt-0.5" />
            <div className="text-xs text-ink leading-relaxed">
              <strong>Внимание:</strong> инвестирование сопряжено с риском полной или частичной
              потери средств. Wealth Hub раскрывает риски проекта в соответствии с ФЗ-259.
              Перед инвестированием изучите документы и оцените собственную готовность к риску.
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[80px] h-fit">
          <div className="bg-white border border-line p-6">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Цель сбора</div>
            <div className="font-display text-3xl font-semibold text-ink mb-5">{formatRub(project.goal)} ₽</div>

            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-xs uppercase tracking-wider text-muted">Собрано</div>
              <div className="font-mono font-semibold text-ink text-sm">
                {pct(project.raised, project.goal).toFixed(1)}%
              </div>
            </div>
            <div className="font-display text-xl font-semibold text-ink mb-2">{formatRub(project.raised)} ₽</div>
            <ProgressBar value={pct(project.raised, project.goal)} />

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Metric icon={TrendingUp} label="Доходность" value={`${project.expected_return}%`} accent="violet" />
              <Metric icon={Target}     label="Окупаемость" value={`${project.payback_years} г.`} />
              <Metric icon={Layers}     label="Минимум" value={`${formatRub(project.min_investment)} ₽`} />
              <Metric icon={Calendar}   label="Закрытие" value={project.closing_date || '—'} accent="orange" />
            </div>

            <div className="mt-5 pt-4 border-t border-line">
              <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <Calendar size={11} /> Периодичность выплат
              </div>
              <div className="text-sm text-ink">
                Дивиденды — <strong>ежеквартально</strong>
                <span className="text-muted">, в среднем </span>
                <span className="font-mono text-violet font-semibold">
                  {formatRub((Number(project.min_investment) * Number(project.expected_return)) / 100 / 4)} ₽
                </span>
                <span className="text-muted"> на каждые </span>
                <span className="font-mono">{formatRub(project.min_investment)} ₽</span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-line space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2"><MapPin size={12} /> {project.geography || '—'}</div>
              <div className="flex items-center gap-2"><Building2 size={12} /> {industry}</div>
            </div>

            {!user ? (
              <div className="mt-5 p-3 bg-paper-2 text-xs text-muted">
                <Lock size={14} className="inline mr-1.5" />
                Войдите как инвестор, чтобы вложиться в проект.
              </div>
            ) : user.role !== 'investor' ? (
              <div className="mt-5 p-3 bg-paper-2 text-xs text-muted">
                <Lock size={14} className="inline mr-1.5" />
                Только инвесторы могут вкладывать в проекты.
              </div>
            ) : !user.can_invest ? (
              <div className="mt-5 p-3 bg-orange-tint border-l-2 border-orange text-xs text-ink">
                <AlertTriangle size={14} className="inline mr-1.5 text-orange" />
                Подтвердите личность через Госуслуги в личном кабинете, чтобы инвестировать.
              </div>
            ) : (
              <Button variant="primary" size="lg" className="w-full mt-5" onClick={() => setInvestOpen(true)}>
                Инвестировать
              </Button>
            )}
          </div>

          <div className="mt-3 bg-violet-tint border border-violet/20 p-4 flex gap-3 text-xs">
            <ShieldCheck size={16} className="text-violet flex-shrink-0 mt-0.5" />
            <div className="text-ink leading-relaxed">
              Все инвестиции проходят через эскроу-счёт. Подписание сделки —
              квалифицированной электронной подписью.
            </div>
          </div>
        </aside>
      </div>

      {investOpen && user && (
        <InvestModal
          project={project}
          balance={Number(portfolio.balance) || 0}
          onClose={() => setInvestOpen(false)}
          onConfirm={async (amount) => {
            try {
              await investApi.create({
                project_id: project.id,
                amount,
                risk_disclaimer_accepted: true,
              });
              showToast(`Инвестиция ${formatRub(amount)} ₽ оформлена`, 'success');
              setInvestOpen(false);
              onInvested && onInvested();
            } catch (e) {
              showToast(e.message || 'Ошибка инвестирования', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  const cls = accent === 'violet' ? 'text-violet' : accent === 'orange' ? 'text-orange' : 'text-ink';
  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted mb-0.5">
        <Icon size={11} /> {label}
      </div>
      <div className={`font-display text-base font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function InvestModal({ project, balance, onClose, onConfirm }) {
  const [step, setStep]     = useState(1);
  const [amount, setAmount] = useState(Number(project.min_investment) || 1000);
  const [agreed, setAgreed] = useState(false);

  const goalNum    = Number(project.goal) || 0;
  const minNum     = Number(project.min_investment) || 0;
  const raisedNum  = Number(project.raised) || 0;
  const remaining  = goalNum - raisedNum;
  const sharePct   = goalNum > 0 ? ((Number(amount) / goalNum) * 100).toFixed(2) : '0';
  const exceedsBal = Number(amount) > balance;
  const belowMin   = Number(amount) < minNum;
  const exceedsRem = Number(amount) > remaining;
  const valid      = !exceedsBal && !belowMin && !exceedsRem && agreed;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <div className="relative bg-white border border-ink w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">Инвестирование · Шаг {step}/2</div>
            <div className="font-display text-lg font-semibold text-ink">{project.name}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        {step === 1 && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Stat label="Доступный баланс" value={`${formatRub(balance)} ₽`} />
              <Stat label="Минимум" value={`${formatRub(minNum)} ₽`} />
            </div>

            <Field label="Сумма инвестиции, ₽" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />

            <div className="grid grid-cols-3 gap-2 mt-3">
              {[minNum, minNum * 5, minNum * 10].map((v) => (
                <button key={v} onClick={() => setAmount(v)}
                        className="px-2 py-1.5 text-xs border border-line hover:border-ink hover:bg-paper-2">
                  {formatRub(v)} ₽
                </button>
              ))}
            </div>

            {exceedsBal && <Warn type="error">Сумма превышает доступный баланс</Warn>}
            {belowMin && <Warn>Минимум — {formatRub(minNum)} ₽</Warn>}
            {exceedsRem && <Warn>Осталось привлечь только {formatRub(remaining)} ₽</Warn>}

            <div className="mt-5 p-4 bg-paper-2 border border-line space-y-1.5 text-sm">
              <Row label="Доля в проекте" value={`~${sharePct}%`} />
              <Row label="Прогноз дохода" value={`~${formatRub((Number(amount) * Number(project.expected_return)) / 100)} ₽ / год`} />
              <Row label="Срок окупаемости" value={`${project.payback_years} года`} />
            </div>

            <label className="mt-5 flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-orange" />
              <span className="text-xs text-ink leading-relaxed">
                Я ознакомлен с риск-декларацией по ФЗ-259, подтверждаю готовность к возможной потере средств.
              </span>
            </label>

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Отмена</Button>
              <Button variant="primary" className="flex-1" disabled={!valid} onClick={() => setStep(2)}>
                Подтвердить
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <div className="bg-paper-2 border border-line p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">Сделка</div>
              <Row label="Проект"   value={project.name} />
              <Row label="Сумма"    value={`${formatRub(Number(amount))} ₽`} />
              <Row label="Доля"     value={`~${sharePct}%`} />
            </div>

            <div className="mt-5 bg-violet-tint border border-violet/20 p-4 flex gap-3 text-xs text-ink">
              <ShieldCheck size={16} className="text-violet flex-shrink-0 mt-0.5" />
              <div>
                После подтверждения средства будут заблокированы на эскроу-счёте.
                Подписание сделки — квалифицированной ЭП.
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Изменить
              </Button>
              <Button variant="dark" className="flex-1" icon={Check} onClick={() => onConfirm(Number(amount))}>
                Подписать и инвестировать
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-paper-2 border border-line px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display font-semibold text-ink text-base">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function Warn({ type, children }) {
  const cls = type === 'error'
    ? 'bg-[#FBE6E3] border-[#B23B2C]'
    : 'bg-orange-tint border-orange';
  return <div className={`mt-4 ${cls} border-l-2 p-3 text-xs text-ink`}>{children}</div>;
}
