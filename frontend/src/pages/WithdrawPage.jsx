import { useState, useEffect } from 'react';
import { Wallet, AlertTriangle, ArrowDownRight, Banknote, Calculator, Info } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { authApi } from '../api/client.js';
import { formatRub } from '../utils/format.js';

const COMMISSION_RATE = 0.01;  // 1% комиссия платформы
const NDFL_RATE       = 0.13;  // 13% НДФЛ для резидентов

export default function WithdrawPage({ onNavigate }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [portfolio, setPortfolio] = useState({ balance: 0, dividends: 0 });
  const [amount, setAmount]       = useState('');
  const [bik, setBik]             = useState('');
  const [account, setAccount]     = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName]   = useState('');
  const [agreed, setAgreed]       = useState(false);

  useEffect(() => {
    if (user) authApi.portfolio().then(setPortfolio).catch(() => {});
    if (user?.full_name_ru) setHolderName(user.full_name_ru);
  }, [user]);

  if (!user) return null;

  const balance     = +portfolio.balance || 0;
  const numAmount   = +amount || 0;
  const commission  = numAmount * COMMISSION_RATE;
  // НДФЛ начисляется только на сумму, превышающую вложенный капитал.
  // Здесь упрощённо — на всю сумму, если выводятся «дивиденды»;
  // в учебных целях считаем 13% от прибыльной части (берём dividends как proxy).
  const taxableAmount = Math.min(numAmount, +portfolio.dividends || 0);
  const tax           = taxableAmount * NDFL_RATE;
  const toReceive     = numAmount - commission - tax;

  const exceedsBal = numAmount > balance;
  const belowMin   = numAmount > 0 && numAmount < 1000;
  const valid      = numAmount > 0 && !exceedsBal && !belowMin && bik && account && holderName && agreed;

  const submit = () => {
    showToast('Заявка на вывод средств принята. Срок зачисления — 1-3 рабочих дня.', 'success');
    onNavigate('finance');
  };

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Wealth Hub · Финансы
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Вывод средств
      </h1>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Форма */}
        <div className="space-y-6">
          {/* Баланс */}
          <div className="bg-white border border-line p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-violet text-white flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted">Доступно к выводу</div>
              <div className="font-display text-2xl font-semibold text-ink">{formatRub(balance)} ₽</div>
            </div>
          </div>

          {/* Сумма */}
          <div className="bg-white border border-line p-6">
            <div className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <Banknote size={16} /> Сумма к выводу
            </div>
            <Field
              label="Введите сумму, ₽"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10 000"
              hint="Минимальная сумма — 1 000 ₽"
            />
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[10_000, 50_000, 100_000, balance].map((v, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(v)}
                  disabled={v > balance}
                  className="px-2 py-1.5 text-xs border border-line hover:border-ink hover:bg-paper-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {i === 3 ? 'Всё' : formatRub(v)}
                </button>
              ))}
            </div>
            {exceedsBal && (
              <div className="mt-3 text-xs text-[#B23B2C] bg-[#FBE6E3] p-2.5 border-l-2 border-[#B23B2C]">
                Сумма превышает доступный баланс
              </div>
            )}
            {belowMin && (
              <div className="mt-3 text-xs text-orange bg-orange-tint p-2.5 border-l-2 border-orange">
                Минимум — 1 000 ₽
              </div>
            )}
          </div>

          {/* Реквизиты */}
          <div className="bg-white border border-line p-6">
            <div className="font-display text-base font-semibold text-ink mb-4">
              Банковские реквизиты
            </div>
            <div className="space-y-3">
              <Field
                label="ФИО получателя*"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                hint="Должно совпадать с владельцем счёта"
              />
              <Field
                label="БИК банка*"
                value={bik}
                onChange={(e) => setBik(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="9 цифр"
              />
              <Field
                label="Номер счёта*"
                value={account}
                onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 20))}
                placeholder="20 цифр"
                hint="Расчётный счёт получателя в банке"
              />
              <Field
                label="Название банка"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Тинькофф, Сбербанк, ВТБ..."
              />
            </div>
          </div>

          {/* Условия */}
          <div className="bg-white border border-line p-6">
            <div className="font-display text-base font-semibold text-ink mb-3 flex items-center gap-2">
              <Info size={16} /> Условия и сроки
            </div>
            <ul className="text-sm text-ink space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-orange mt-1">•</span>
                <span>Срок зачисления — <strong>1-3 рабочих дня</strong> после одобрения заявки</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange mt-1">•</span>
                <span>Комиссия платформы — <strong>1%</strong> от суммы вывода</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange mt-1">•</span>
                <span>НДФЛ <strong>13%</strong> удерживается с суммы прибыли (только для резидентов РФ)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange mt-1">•</span>
                <span>Перевод в иностранные банки <strong>не доступен</strong></span>
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-orange"
            />
            <span className="text-xs text-ink leading-relaxed">
              Я подтверждаю верность реквизитов, согласен с комиссией и налоговыми удержаниями.
              Понимаю, что в случае ошибки в реквизитах средства могут не дойти до получателя.
            </span>
          </label>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={ArrowDownRight}
            disabled={!valid}
            onClick={submit}
          >
            Подать заявку на вывод
          </Button>
        </div>

        {/* Сайдбар — расчёт */}
        <div className="lg:sticky lg:top-[80px] h-fit space-y-4">
          <div className="bg-white border border-line p-5">
            <div className="font-display text-base font-semibold text-ink mb-4 flex items-center gap-2">
              <Calculator size={16} /> Расчёт
            </div>
            <CalcRow label="Сумма вывода"        value={`${formatRub(numAmount)} ₽`} />
            <CalcRow label="Комиссия (1%)"        value={`-${formatRub(commission)} ₽`} accent="orange" />
            <CalcRow label="НДФЛ (13% с прибыли)" value={`-${formatRub(tax)} ₽`}        accent="orange" />
            <div className="border-t border-line mt-3 pt-3">
              <CalcRow label="К получению"        value={`${formatRub(Math.max(0, toReceive))} ₽`} bold />
            </div>
          </div>

          <div className="bg-orange-tint border-l-2 border-orange p-4 flex gap-3 text-xs text-ink">
            <AlertTriangle size={16} className="text-orange flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Важно:</strong> расчёт НДФЛ выполнен упрощённо.
              Точная сумма налога определяется налоговой службой РФ исходя из
              даты приобретения долей и суммы фактической прибыли.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcRow({ label, value, accent, bold }) {
  const accentClass = accent === 'orange' ? 'text-orange' : 'text-ink';
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${bold ? 'font-bold' : ''}`}>
      <span className={bold ? 'text-ink' : 'text-muted'}>{label}</span>
      <span className={`font-mono ${bold ? 'text-ink font-display text-lg' : accentClass}`}>{value}</span>
    </div>
  );
}
