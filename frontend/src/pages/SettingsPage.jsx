import { useState } from 'react';
import { Lock, Key, Bell, Shield, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { authApi } from '../api/client.js';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied]           = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [emailNotif, setEmailNotif]   = useState(true);
  const [pushNotif,  setPushNotif]    = useState(true);
  const [smsNotif,   setSmsNotif]     = useState(false);

  if (!user) return null;

  const copyToken = () => {
    navigator.clipboard.writeText(user.api_token);
    setCopied(true);
    showToast('API-токен скопирован', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateToken = async () => {
    if (!confirm('Перевыпустить API-токен? Старый токен перестанет работать.')) return;
    try {
      const data = await authApi.regenerateToken();
      updateUser({ api_token: data.api_token });
      showToast('Токен обновлён', 'success');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Wealth Hub
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Настройки
      </h1>

      <div className="space-y-6">
        {/* Безопасность */}
        <Section icon={Shield} title="Безопасность аккаунта">
          <Row
            title="Двухфакторная аутентификация"
            description="Дополнительная защита при входе через SMS-код"
            action={
              <Toggle
                value={user.two_factor_enabled}
                onChange={() => showToast('Эта функция будет доступна в следующем обновлении', 'info')}
              />
            }
          />
          <Row
            title="Изменить пароль"
            description="Рекомендуется менять пароль каждые 90 дней"
            action={
              <Button variant="light" size="sm" onClick={() => showToast('Функция в разработке', 'info')}>
                Изменить
              </Button>
            }
          />
          <Row
            title="История входов"
            description="Просмотр устройств и сессий"
            action={
              <Button variant="light" size="sm" onClick={() => showToast('Функция в разработке', 'info')}>
                Открыть
              </Button>
            }
          />
        </Section>

        {/* Уведомления */}
        <Section icon={Bell} title="Уведомления">
          <Row
            title="Уведомления на e-mail"
            description="Письма о статусе инвестиций, дивидендах, обновлениях проектов"
            action={<Toggle value={emailNotif} onChange={() => setEmailNotif(!emailNotif)} />}
          />
          <Row
            title="Push-уведомления"
            description="В браузере и мобильном приложении"
            action={<Toggle value={pushNotif} onChange={() => setPushNotif(!pushNotif)} />}
          />
          <Row
            title="SMS-уведомления"
            description="Только важные события (требует подтверждённого телефона)"
            action={<Toggle value={smsNotif} onChange={() => setSmsNotif(!smsNotif)} />}
          />
        </Section>

        {/* API */}
        <Section icon={Key} title="API-доступ">
          <div className="px-5 py-4">
            <div className="text-sm font-semibold text-ink mb-1">Ваш API-токен</div>
            <div className="text-xs text-muted mb-3">
              Используйте токен для интеграции с Wealth Hub API. Не передавайте его третьим лицам.
            </div>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 px-3 py-2.5 bg-paper-2 border border-line text-xs font-mono text-ink truncate">
                {tokenVisible ? user.api_token : '••••••••••••••••••••••••••••••'}
              </code>
              <Button variant="light" size="sm" onClick={() => setTokenVisible(!tokenVisible)}>
                {tokenVisible ? 'Скрыть' : 'Показать'}
              </Button>
              <Button variant="light" size="sm" icon={copied ? Check : Copy} onClick={copyToken}>
                {copied ? 'Скоп.' : 'Копировать'}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={regenerateToken}>
                Перевыпустить токен
              </Button>
              <a
                href="https://docs.claude.com"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-violet hover:text-orange font-semibold uppercase tracking-wider"
              >
                Документация API →
              </a>
            </div>
          </div>
        </Section>

        {/* Опасная зона */}
        <Section icon={AlertTriangle} title="Опасная зона" danger>
          <Row
            title="Удалить аккаунт"
            description="Все ваши данные будут удалены безвозвратно. Активные инвестиции должны быть закрыты."
            action={
              <Button variant="danger" size="sm" onClick={() => showToast('Для удаления аккаунта обратитесь в поддержку', 'info')}>
                Удалить
              </Button>
            }
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, danger, children }) {
  return (
    <div className={`bg-white border ${danger ? 'border-[#B23B2C]/30' : 'border-line'}`}>
      <div className="px-5 py-3 border-b border-line flex items-center gap-2">
        <Icon size={16} className={danger ? 'text-[#B23B2C]' : 'text-ink'} />
        <span className="font-display text-base font-semibold text-ink">{title}</span>
      </div>
      <div className="divide-y divide-line-soft">{children}</div>
    </div>
  );
}

function Row({ title, description, action }) {
  return (
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink text-sm">{title}</div>
        <div className="text-xs text-muted mt-0.5">{description}</div>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 transition-colors ${value ? 'bg-violet' : 'bg-line'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
