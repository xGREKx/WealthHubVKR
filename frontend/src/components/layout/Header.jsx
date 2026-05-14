import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Menu, X, LogOut, User as UserIcon, Settings, MessageSquare,
  Wallet, ChevronDown, Briefcase, BarChart3, Home, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { mediaUrl } from '../../api/client.js';

export default function Header({ onNavigate, onOpenSearch, onOpenAuth, currentPage, searchOpen }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Скрываем кнопки авторизации, если пользователь уже на странице login —
  // вместо двух конкурирующих кнопок остаётся только UI самой страницы
  const onLoginPage = currentPage === 'login';

  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  const navItems = useMemo(() => {
    if (!user) return [
      { id: 'home',        label: 'Главная',  icon: Home },
      { id: 'marketplace', label: 'Витрина',  icon: BarChart3 },
    ];
    if (user.role === 'investor') return [
      { id: 'home',        label: 'Главная',     icon: Home },
      { id: 'marketplace', label: 'Витрина',     icon: BarChart3 },
      { id: 'finance',     label: 'Финансы',     icon: Wallet },
      { id: 'analytics',   label: 'Аналитика',   icon: BarChart3 },
    ];
    if (user.role === 'entrepreneur') return [
      { id: 'home',         label: 'Главная',     icon: Home },
      { id: 'marketplace',  label: 'Витрина',     icon: BarChart3 },
      { id: 'entrepreneur', label: 'Мои проекты', icon: Briefcase },
    ];
    if (user.role === 'admin') return [
      { id: 'admin',         label: 'Модерация',     icon: ShieldCheck },
      { id: 'admin-tickets', label: 'Обращения',     icon: MessageSquare },
      { id: 'admin-users',   label: 'Пользователи',  icon: UserIcon },
      { id: 'marketplace',   label: 'Витрина',       icon: BarChart3 },
    ];
    return [];
  }, [user]);

  const roleLabel = user?.role === 'investor' ? 'Инвестор'
                  : user?.role === 'entrepreneur' ? 'Предприниматель'
                  : user?.role === 'admin' ? 'Администратор' : '';

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    onNavigate('home');
    showToast('Вы вышли из аккаунта', 'info');
  };

  const handleDropdownNav = (id) => {
    setDropdownOpen(false);
    onNavigate(id);
  };

  const dropdownItems = useMemo(() => {
    if (!user) return [];
    const common = [
      { id: 'cabinet',  label: 'Личный кабинет', icon: UserIcon },
      { id: 'support',  label: 'Обращения',      icon: MessageSquare },
    ];
    if (user.role === 'investor') {
      return [
        ...common,
        { id: 'withdraw',  label: 'Вывод средств', icon: Wallet },
        { id: 'settings',  label: 'Настройки',     icon: Settings },
      ];
    }
    return [...common, { id: 'settings', label: 'Настройки', icon: Settings }];
  }, [user]);

  return (
    <header className="bg-ink text-white sticky top-0 z-40 border-b border-ink">
      <div className="px-5 md:px-10 py-3 flex items-center gap-4">
        <button
          onClick={() => onNavigate('home')}
          className="font-display font-bold text-xl tracking-wider hover:text-orange transition-colors"
        >
          WEALTH<span className="text-orange"> </span>HUB
        </button>

        <nav className="hidden lg:flex items-center gap-1 ml-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                currentPage === item.id ? 'text-orange' : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          onClick={onOpenSearch}
          id="search-trigger"
          className={`flex items-center gap-2 px-3 py-2 transition-colors ${searchOpen ? 'bg-white/10' : 'hover:bg-white/10'}`}
          aria-label="Поиск"
        >
          <Search size={18} />
          <span className="hidden md:inline text-sm text-white/70">Поиск</span>
        </button>

        {/* Кнопки скрываются: 1) если пользователь авторизован 2) если он на странице login */}
        {!user && !onLoginPage && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Войти
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 text-sm font-semibold bg-orange text-white hover:bg-[#D85F12] transition-colors"
            >
              Зарегистрироваться
            </button>
          </div>
        )}

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 transition-colors ${dropdownOpen ? 'bg-white/10' : 'hover:bg-white/10'}`}
            >
              {user.avatar_url ? (
                <img src={mediaUrl(user.avatar_url)} alt="" className="w-9 h-9 object-cover" />
              ) : (
                <div className="w-9 h-9 bg-orange flex items-center justify-center font-display font-bold text-sm">
                  {(user.first_name_ru?.[0] || user.username?.[0] || '?').toUpperCase()}
                  {(user.last_name_ru?.[0] || '').toUpperCase()}
                </div>
              )}
              <div className="hidden md:flex flex-col items-start leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-white/60">{roleLabel}</div>
                <div className="text-sm font-medium">
                  {user.first_name_ru || user.username}
                </div>
              </div>
              <ChevronDown size={14} className={`text-white/60 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-ink shadow-2xl text-ink anim-fade-up">
                <div className="px-4 py-3 border-b border-line bg-paper-2">
                  <div className="font-semibold text-sm leading-tight">{user.full_name_ru || user.username}</div>
                  <div className="text-xs text-muted truncate">{user.email}</div>
                  {user.verification_status && user.verification_status !== 'not_verified' && (
                    <div className={`mt-1.5 text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1 ${
                      user.verification_status.startsWith('verified') ? 'text-violet' : 'text-orange'
                    }`}>
                      <ShieldCheck size={10} />
                      {user.verification_status === 'verified_esia'   ? 'Подтверждён через Госуслуги' :
                       user.verification_status === 'verified_manual' ? 'Подтверждён вручную' :
                       user.verification_status === 'pending'         ? 'На проверке' : ''}
                    </div>
                  )}
                </div>
                <div className="py-1">
                  {dropdownItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleDropdownNav(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper-2 transition-colors text-left"
                      >
                        <Icon size={16} className="text-muted" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="py-1 border-t border-line">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B23B2C] hover:bg-paper-2 transition-colors text-left"
                  >
                    <LogOut size={16} />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden p-2 hover:bg-white/10"
          aria-label="Меню"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 px-5 py-3 anim-fade-in">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm ${
                  currentPage === item.id ? 'text-orange bg-white/5' : 'text-white/80'
                }`}
              >
                {item.label}
              </button>
            ))}
            {!user && !onLoginPage && (
              <div className="pt-3 mt-3 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => { onOpenAuth('login'); setMenuOpen(false); }}
                  className="flex-1 px-4 py-2 text-sm font-semibold border border-white text-white"
                >
                  Войти
                </button>
                <button
                  onClick={() => { onOpenAuth('register'); setMenuOpen(false); }}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-orange text-white"
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
