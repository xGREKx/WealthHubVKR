import { useState } from 'react';
import { Shield, ShieldCheck, ArrowRight, Lock, UserCheck, Briefcase } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export default function LoginPage({ initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const { login, register, loginWithESIA } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // flex-1 на корневом div заставит страницу растянуться на всю доступную высоту main
  return (
    <div className="flex-1 grid lg:grid-cols-2">
      {/* Левая колонка — фон тянется на всю высоту, т.к. grid item стрейтчится */}
      <div className="bg-ink text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[400px]">
        <div className="absolute inset-0 grid-bg opacity-[0.07] pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.3em] text-orange font-semibold mb-6">
            Wealth Hub · Защищённый вход
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.1]">
            Капитал, которому<br />
            <span className="text-orange">можно</span> доверять.
          </h1>
          <p className="mt-6 text-white/70 max-w-md leading-relaxed">
            Защита персональных данных по ФЗ-152, инвестиционные сделки по ФЗ-259,
            квалифицированная электронная подпись для каждой транзакции.
          </p>

          <div className="mt-12 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-white/80">
              <ShieldCheck size={18} className="text-orange" />
              <span>Двухфакторная аутентификация</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Lock size={18} className="text-orange" />
              <span>Эскроу-счета для каждой инвестиции</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Shield size={18} className="text-orange" />
              <span>Многоступенчатая модерация проектов</span>
            </div>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0 text-xs text-white/40 font-mono leading-relaxed">
          ВКР · Финансовый университет при Правительстве РФ · 2026<br />
          Верховский Г. А., ИТвСФТ24-1м
        </div>
      </div>

      {/* Правая колонка */}
      <div className="bg-paper p-8 md:p-12 lg:p-16 flex items-start lg:items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="flex gap-1 mb-8 border-b border-line">
            <button
              onClick={() => setMode('login')}
              className={`px-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                mode === 'login' ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              Войти
            </button>
            <button
              onClick={() => setMode('register')}
              className={`ml-4 px-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                mode === 'register' ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              Зарегистрироваться
            </button>
          </div>

          <GosuslugiButton
            label={mode === 'login' ? 'Войти через Госуслуги' : 'Регистрация через Госуслуги'}
            onClick={async () => {
              try {
                setSubmitting(true);
                const u = await loginWithESIA('investor');
                onAuthSuccess(u);
              } catch (e) {
                showToast(e.message || 'Не удалось авторизоваться через ЕСИА', 'error');
              } finally { setSubmitting(false); }
            }}
            disabled={submitting}
          />

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-medium">
              или {mode === 'login' ? 'по логину' : 'обычная регистрация'}
            </div>
            <div className="flex-1 h-px bg-line" />
          </div>

          {mode === 'login'
            ? <LoginForm onSubmit={login} onSuccess={onAuthSuccess} />
            : <RegisterForm onSubmit={register} onSuccess={onAuthSuccess} />}

          <div className="mt-10 pt-6 border-t border-line">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-3 flex items-center gap-2">
              <Lock size={11} /> Быстрый вход для тестирования
            </div>
            <div className="grid gap-2">
              <DemoRole label="Инвестор"        onClick={() => quickDemo('investor',     loginWithESIA, onAuthSuccess, showToast)} icon={UserCheck} />
              <DemoRole label="Предприниматель" onClick={() => quickDemo('entrepreneur', loginWithESIA, onAuthSuccess, showToast)} icon={Briefcase} />
              <DemoRole label="Администратор"   onClick={() => quickDemo('admin',         loginWithESIA, onAuthSuccess, showToast)} icon={Shield} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function quickDemo(role, loginWithESIA, onAuthSuccess, showToast) {
  try {
    // 2-й аргумент = isDemoButton — заходим под seed-юзером
    const u = await loginWithESIA(role, true);
    onAuthSuccess(u);
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
}

function GosuslugiButton({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between p-4 transition-all disabled:opacity-50 group"
      style={{ backgroundColor: '#0066B3' }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = '#005599')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.backgroundColor = '#0066B3')}
    >
      <div className="flex items-center gap-3 text-white">
        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm">
          <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 6 L24 6 L24 11 L13 11 L13 14 L21 14 L21 19 L13 19 L13 26 L8 26 Z" fill="#0066B3" />
          </svg>
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-wider text-white/80">Госуслуги · ЕСИА</div>
          <div className="font-semibold text-base">{label}</div>
        </div>
      </div>
      <ArrowRight size={20} className="text-white group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

function LoginForm({ onSubmit, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }
    try {
      setSubmitting(true);
      const user = await onSubmit(username, password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Логин"  value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ivan_petrov" />
      <Field label="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
      {error && <div className="text-xs text-[#B23B2C] bg-[#FBE6E3] p-2.5 border-l-2 border-[#B23B2C]">{error}</div>}
      <Button variant="dark" className="w-full" size="lg" iconRight={ArrowRight} disabled={submitting}>
        {submitting ? 'Входим...' : 'Войти'}
      </Button>
    </form>
  );
}

function RegisterForm({ onSubmit, onSuccess }) {
  const [form, setForm] = useState({
    role: 'investor',
    username: '', email: '', password: '',
    last_name_ru: '', first_name_ru: '', middle_name_ru: '',
    phone: '', inn: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password || !form.last_name_ru || !form.first_name_ru) {
      setError('Заполните обязательные поля: логин, пароль, фамилия, имя');
      return;
    }
    if (form.password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }
    try {
      setSubmitting(true);
      const user = await onSubmit(form);
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
          Регистрируюсь как
        </span>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            active={form.role === 'investor'}
            onClick={() => setForm({ ...form, role: 'investor' })}
            icon={UserCheck} label="Инвестор" desc="Ищу проекты для вложений"
          />
          <RoleOption
            active={form.role === 'entrepreneur'}
            onClick={() => setForm({ ...form, role: 'entrepreneur' })}
            icon={Briefcase} label="Предприниматель" desc="Привлекаю инвестиции"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Фамилия*" value={form.last_name_ru}  onChange={update('last_name_ru')} />
        <Field label="Имя*"     value={form.first_name_ru} onChange={update('first_name_ru')} />
      </div>
      <Field label="Отчество" value={form.middle_name_ru} onChange={update('middle_name_ru')} />

      <Field label="Логин*" value={form.username} onChange={update('username')} placeholder="ivan_petrov" />
      <Field label="E-mail" type="email" value={form.email} onChange={update('email')} placeholder="name@example.ru" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Телефон" value={form.phone} onChange={update('phone')} placeholder="+7..." />
        <Field label="ИНН"     value={form.inn}   onChange={update('inn')}   placeholder="12 цифр" />
      </div>

      <Field label="Пароль*" type="password" value={form.password} onChange={update('password')} hint="Минимум 6 символов" />

      {error && <div className="text-xs text-[#B23B2C] bg-[#FBE6E3] p-2.5 border-l-2 border-[#B23B2C]">{error}</div>}

      <Button variant="dark" className="w-full" size="lg" iconRight={ArrowRight} disabled={submitting}>
        {submitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
      </Button>

      <div className="text-[11px] text-muted leading-relaxed">
        Регистрируясь, вы соглашаетесь с обработкой персональных данных по ФЗ-152.
        Для инвестирования потребуется подтверждение через Госуслуги.
      </div>
    </form>
  );
}

function RoleOption({ active, onClick, icon: Icon, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 border text-left transition-all ${
        active ? 'border-ink bg-paper-2' : 'border-line bg-white hover:border-ink/50'
      }`}
    >
      <Icon size={18} className={active ? 'text-orange' : 'text-muted'} />
      <div className={`mt-1.5 text-sm font-semibold ${active ? 'text-ink' : 'text-muted'}`}>{label}</div>
      <div className="text-[10px] text-muted leading-tight">{desc}</div>
    </button>
  );
}

function DemoRole({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 bg-white border border-line hover:border-ink hover:bg-paper-2 transition-colors text-left group"
    >
      <Icon size={16} className="text-orange flex-shrink-0" />
      <span className="text-sm font-semibold text-ink flex-1">{label}</span>
      <ArrowRight size={14} className="text-muted group-hover:text-ink group-hover:translate-x-1 transition-all" />
    </button>
  );
}
