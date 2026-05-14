import { useState, useEffect, useRef, useMemo } from 'react';
import {
  User as UserIcon, Check, Copy, KeyRound, Edit3, ChevronLeft, ChevronRight,
  ArrowRight, ShieldCheck, AlertTriangle, Camera, Lock,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import Legend from '../components/charts/Legend.jsx';
import { formatRub } from '../utils/format.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authApi, investApi, mediaUrl } from '../api/client.js';

export default function CabinetPage({ onNavigate, portfolioVersion = 0 }) {
  const { user, refreshUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    last_name_ru: '', first_name_ru: '', middle_name_ru: '',
    inn: '', passport: '', phone: '', email: '',
  });
  const [copied, setCopied] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [chartIdx, setChartIdx] = useState(0);
  const [portfolio, setPortfolio] = useState({ balance: 0, invested: 0, dividends: 0 });
  const [investments, setInvestments] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        last_name_ru: user.last_name_ru || '',
        first_name_ru: user.first_name_ru || '',
        middle_name_ru: user.middle_name_ru || '',
        inn: user.inn || '',
        passport: user.passport || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    authApi.portfolio().then(setPortfolio).catch(() => {});
    if (user.role === 'investor') {
      investApi.list().then((d) => setInvestments(d.results || d)).catch(() => {});
    }
  }, [user, portfolioVersion]);

  const balance       = Number(portfolio.balance)   || 0;
  const totalInvested = Number(portfolio.invested)  || 0;
  const dividends     = Number(portfolio.dividends) || 0;

  const { lowRiskAmt, mediumRiskAmt, highRiskAmt } = useMemo(() => {
    let low = 0, med = 0, high = 0;
    investments.filter((i) => !i.is_sold).forEach((i) => {
      const amt = Number(i.amount) || 0;
      if (i.risk_at_purchase === 'low')         low  += amt;
      else if (i.risk_at_purchase === 'medium') med  += amt;
      else if (i.risk_at_purchase === 'high')   high += amt;
    });
    return { lowRiskAmt: low, mediumRiskAmt: med, highRiskAmt: high };
  }, [investments]);

  if (!user) return null;

  const isESIA       = user.registered_via_esia;
  const isVerified   = user.verification_status?.startsWith('verified');
  const isPending    = user.verification_status === 'pending';

  // Все 4 варианта сегментов всегда одинаковой длины — чтобы Legend не прыгал
  const segmentsRisk = [
    { label: 'Низкий риск',         value: lowRiskAmt,    color: '#5F2F8C' },
    { label: 'Средний риск',        value: mediumRiskAmt, color: '#F0A040' },
    { label: 'Высокий риск',        value: highRiskAmt,   color: '#F07220' },
    { label: 'Свободный остаток',   value: balance,       color: '#7BBF6A' },
  ];

  const segmentsBreakdown = [
    { label: 'Вложено в проекты',     value: totalInvested, color: '#5F2F8C' },
    { label: 'Свободные средства',    value: balance,       color: '#7BBF6A' },
    { label: 'Накопленные дивиденды', value: dividends,     color: '#F07220' },
    { label: '\u00A0',                 value: 0,             color: 'transparent' }, // пустая строка-заглушка для одинаковой высоты
  ];

  const charts = [
    { title: 'Распределение по рискам', segments: segmentsRisk },
    { title: 'Структура портфеля',      segments: segmentsBreakdown },
  ];
  const currentChart = charts[chartIdx];

  // === Действия ===

  const saveProfile = async () => {
    try {
      const updated = await authApi.updateMe(form);
      updateUser(updated);
      setEditing(false);
      if (!isESIA) {
        showToast('Изменения отправлены на проверку.', 'info');
      } else {
        showToast('Данные сохранены', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Не удалось сохранить', 'error');
    }
  };

  const verifyESIA = async () => {
    try {
      const updated = await authApi.verifyESIA();
      updateUser(updated);
      showToast('Личность подтверждена через Госуслуги', 'success');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await authApi.uploadAvatar(file);
      updateUser(updated);
      showToast('Аватар обновлён', 'success');
    } catch (err) {
      showToast(err.message || 'Не удалось загрузить', 'error');
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(user.api_token);
    setCopied(true);
    showToast('API-токен скопирован', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Личный кабинет
      </h1>

      {!isVerified && user.role === 'investor' && (
        <div className="mb-6 bg-orange-tint border-l-4 border-orange p-4 flex flex-wrap items-center gap-4">
          <AlertTriangle size={24} className="text-orange flex-shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold text-ink">
              {isPending ? 'Ваши данные на проверке' : 'Подтвердите личность для инвестирования'}
            </div>
            <div className="text-xs text-muted mt-0.5">
              {isPending
                ? 'Срок рассмотрения — до 3 рабочих дней.'
                : 'Без подтверждения вы не сможете инвестировать в проекты (ФЗ-115).'}
            </div>
          </div>
          {!isPending && (
            <button
              onClick={verifyESIA}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: '#0066B3' }}
            >
              <ShieldCheck size={16} />
              Подтвердить через Госуслуги
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Левая часть */}
        <div>
          <div className="bg-white border border-line p-6 mb-3">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-32 h-32 bg-paper-2 border border-line group overflow-hidden hover:border-ink transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={mediaUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={56} className="text-ink m-auto absolute inset-0" strokeWidth={1.2} />
                  )}
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors flex items-center justify-center">
                    <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarSelected} className="hidden" />
                <div className="text-[10px] text-muted text-center mt-1.5 uppercase tracking-wider">
                  Сменить фото
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {[
                  { key: 'last_name_ru',   label: 'Фамилия' },
                  { key: 'first_name_ru',  label: 'Имя' },
                  { key: 'middle_name_ru', label: 'Отчество' },
                  { key: 'passport',       label: 'Паспортные данные' },
                  { key: 'inn',            label: 'ИНН' },
                ].map(({ key, label }) => (
                  <ProfileRow
                    key={key} label={label} value={form[key]}
                    onChange={editing ? (v) => setForm({ ...form, [key]: v }) : null}
                    locked={isESIA && !editing}
                  />
                ))}
              </div>
            </div>
          </div>

          {isESIA ? (
            <button
              onClick={verifyESIA}
              className="w-full text-center text-sm py-2.5 transition-colors flex items-center justify-center gap-2 text-white"
              style={{ backgroundColor: '#0066B3' }}
            >
              <ShieldCheck size={14} /> Обновить данные через Госуслуги
            </button>
          ) : editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>Отмена</Button>
              <Button variant="primary" className="flex-1" onClick={saveProfile}>
                Отправить на проверку
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-center text-sm text-muted hover:text-ink py-2 border-b border-line transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 size={14} /> Редактировать данные
            </button>
          )}

          <div className="mt-6 bg-white border border-line p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center ${
                user.e_signature_status === 'verified' ? 'bg-violet text-white' : 'bg-paper-2 text-muted'
              }`}>
                <Check size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-semibold text-ink">
                  {user.e_signature_status === 'verified' ? 'Подтверждённая ЭП' : 'ЭП не оформлена'}
                </div>
                <div className="text-xs text-muted">
                  Квалифицированная электронная подпись
                </div>
              </div>
            </div>
            {user.e_signature_status === 'verified' && (
              <span className="px-3 py-1 bg-violet-soft text-violet text-[11px] font-bold uppercase tracking-wider">
                Активна
              </span>
            )}
          </div>

          <div className="mt-3 bg-white border border-line p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ink text-orange flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <div className="font-semibold text-ink">API-токен</div>
                  <div className="text-xs text-muted">Для интеграции по REST API</div>
                </div>
              </div>
              <button onClick={() => setTokenVisible(!tokenVisible)} className="text-xs text-muted hover:text-ink">
                {tokenVisible ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-paper-2 border border-line text-xs font-mono text-ink truncate">
                {tokenVisible ? user.api_token : '••••••••••••••••••••••••••••••'}
              </code>
              <Button variant="light" size="sm" icon={copied ? Check : Copy} onClick={copyToken}>
                {copied ? 'Скоп.' : 'Копировать'}
              </Button>
            </div>
          </div>
        </div>

        {/* Правая часть — карусель аналитики с фиксированной высотой */}
        <div className="bg-white border border-line p-6 flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-1">
            Аналитика
          </div>
          {/* Заголовок: фиксированная высота, чтобы не прыгал */}
          <h2 className="font-display text-xl md:text-2xl font-semibold text-ink mb-6 min-h-[32px]">
            {currentChart.title}
          </h2>

          {/* Donut в фиксированном по высоте блоке */}
          <div className="flex items-center gap-4 mb-6" style={{ minHeight: 200 }}>
            <button
              onClick={() => setChartIdx((i) => (i - 1 + charts.length) % charts.length)}
              className="w-8 h-8 border border-line hover:bg-paper-2 flex items-center justify-center flex-shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
            <div key={chartIdx} className="flex-1 flex justify-center anim-fade-in">
              <DonutChart segments={currentChart.segments} size={200} thickness={32} />
            </div>
            <button
              onClick={() => setChartIdx((i) => (i + 1) % charts.length)}
              className="w-8 h-8 border border-line hover:bg-paper-2 flex items-center justify-center flex-shrink-0"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Легенда — фиксированная высота под 4 строки, чтобы не прыгало при смене графика */}
          <div className="min-h-[120px]">
            <Legend items={currentChart.segments} />
          </div>

          <div className="flex justify-center gap-1.5 mt-2">
            {charts.map((_, i) => (
              <button
                key={i}
                onClick={() => setChartIdx(i)}
                className={`h-1 transition-all ${i === chartIdx ? 'w-6 bg-ink' : 'w-2 bg-line'}`}
              />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <div className="text-xs text-muted mb-1">Баланс портфеля</div>
            <div className="font-display text-2xl font-semibold text-ink">
              {formatRub(balance)} ₽
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <div className="text-muted">Вложено</div>
                <div className="font-mono font-semibold text-ink">{formatRub(totalInvested)} ₽</div>
              </div>
              <div>
                <div className="text-muted">Дивиденды</div>
                <div className="font-mono font-semibold text-violet">{formatRub(dividends)} ₽</div>
              </div>
            </div>
          </div>

          {user.role === 'investor' && (
            <Button
              variant="dark" className="w-full mt-5" iconRight={ArrowRight}
              onClick={() => onNavigate('finance')}
            >
              Перейти к портфелю
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value, onChange, locked }) {
  return (
    <div className="bg-paper-2 border border-line px-4 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">{label}</div>
      {onChange ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-semibold text-ink text-sm outline-none"
        />
      ) : (
        <div className="font-semibold text-ink text-sm flex items-center justify-between">
          <span>{value || '—'}</span>
          {locked && <Lock size={12} className="text-muted" />}
        </div>
      )}
    </div>
  );
}
