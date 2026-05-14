import { useState, useEffect } from 'react';
import { Search, Shield, ShieldCheck, ShieldX, X, Check, UserCheck } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { adminApi } from '../api/client.js';

const ROLE_LABELS = {
  investor:     { label: 'Инвестор',        color: 'bg-paper text-ink' },
  entrepreneur: { label: 'Предприниматель', color: 'bg-orange-soft text-ink' },
  admin:        { label: 'Администратор',   color: 'bg-violet text-white' },
};

const VERIFICATION_LABELS = {
  not_verified:    { label: 'Не подтверждён',           color: 'text-muted' },
  pending:         { label: 'На проверке',              color: 'text-orange' },
  verified_esia:   { label: 'Подтв. через Госуслуги',  color: 'text-violet' },
  verified_manual: { label: 'Подтв. вручную',          color: 'text-violet' },
};

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [activeUser, setActiveUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const data = await adminApi.users(params);
      setUsers(data.results || data);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterRole]); // eslint-disable-line

  const handleAction = async (action, userId, ...args) => {
    try {
      await adminApi[action](userId, ...args);
      showToast('Готово', 'success');
      load();
      setActiveUser(null);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Администрирование
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Пользователи
      </h1>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Поиск по имени, ИНН, e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            className="pl-9 pr-4 py-2 bg-white border border-line text-sm w-72 focus:outline-none focus:border-ink"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 bg-white border border-line text-sm focus:outline-none focus:border-ink cursor-pointer"
        >
          <option value="">Все роли</option>
          <option value="investor">Инвесторы</option>
          <option value="entrepreneur">Предприниматели</option>
          <option value="admin">Администраторы</option>
        </select>
        <Button variant="light" onClick={load}>Применить</Button>
      </div>

      {loading ? <div className="text-muted text-sm">Загрузка...</div>
       : users.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center text-muted">
          Нет пользователей
        </div>
       ) : (
        <div className="bg-white border border-line">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-semibold">Пользователь</th>
                <th className="px-4 py-3 font-semibold">Роль</th>
                <th className="px-4 py-3 font-semibold">Верификация</th>
                <th className="px-4 py-3 font-semibold">Регистрация</th>
                <th className="px-4 py-3 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role  = ROLE_LABELS[u.role];
                const ver   = VERIFICATION_LABELS[u.verification_status];
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-line-soft last:border-b-0 hover:bg-paper-2">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-ink">
                        {u.full_name_ru || u.username}
                        {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider text-violet">(вы)</span>}
                      </div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${role?.color}`}>
                        {role?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-xs font-semibold ${ver?.color}`}>{ver?.label}</div>
                      {u.registered_via_esia && (
                        <div className="text-[10px] text-muted mt-0.5">через Госуслуги</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="light" onClick={() => setActiveUser(u)} disabled={isMe}>
                        Управление
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeUser && (
        <ManageUserModal
          user={activeUser}
          onClose={() => setActiveUser(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

function ManageUserModal({ user, onClose, onAction }) {
  const isAdmin   = user.role === 'admin';
  const isVerified = user.verification_status?.startsWith('verified');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <div className="relative bg-white border border-ink w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">Управление пользователем</div>
            <div className="font-display text-lg font-semibold text-ink">{user.full_name_ru || user.username}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-paper-2 border border-line p-4 text-xs space-y-1">
            <div><span className="text-muted">Логин:</span> <span className="font-mono">{user.username}</span></div>
            <div><span className="text-muted">E-mail:</span> <span className="font-mono">{user.email || '—'}</span></div>
            <div><span className="text-muted">Текущая роль:</span> <span className="font-semibold">{ROLE_LABELS[user.role]?.label}</span></div>
            <div><span className="text-muted">Статус:</span> <span className="font-semibold">{VERIFICATION_LABELS[user.verification_status]?.label}</span></div>
          </div>

          {/* Верификация */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Верификация</div>
            {isVerified ? (
              <div className="flex items-center gap-2 text-sm text-violet">
                <ShieldCheck size={16} /> Учётная запись подтверждена
                <button
                  onClick={() => onAction('rejectVerification', user.id)}
                  className="ml-auto text-xs text-muted hover:text-[#B23B2C]"
                >
                  Отозвать
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="violet" className="w-full" icon={ShieldCheck}
                        onClick={() => onAction('verifyUser', user.id, 'esia')}>
                  Подтвердить через Госуслуги (галка)
                </Button>
                <Button variant="light" className="w-full" icon={UserCheck}
                        onClick={() => onAction('verifyUser', user.id, 'manual')}>
                  Подтвердить вручную
                </Button>
                <Button variant="ghost" className="w-full" icon={ShieldX}
                        onClick={() => onAction('rejectVerification', user.id)}>
                  Отказать в верификации
                </Button>
              </div>
            )}
          </div>

          {/* Админские права */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Права администратора</div>
            {isAdmin ? (
              <Button variant="ghost" className="w-full" icon={ShieldX}
                      onClick={() => onAction('revokeAdmin', user.id)}>
                Снять права администратора
              </Button>
            ) : (
              <Button variant="dark" className="w-full" icon={Shield}
                      onClick={() => onAction('makeAdmin', user.id)}>
                Назначить администратором
              </Button>
            )}
          </div>

          <div className="text-[11px] text-muted leading-relaxed pt-2 border-t border-line">
            Изменения вступят в силу немедленно. Пользователь получит уведомление на почту.
          </div>
        </div>
      </div>
    </div>
  );
}
