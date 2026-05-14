import { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, X, Check, Clock } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { supportApi } from '../api/client.js';

const STATUS_LABELS = {
  open:     { label: 'Открыто',  color: 'bg-orange text-white',  icon: Clock },
  answered: { label: 'Отвечено', color: 'bg-violet text-white',  icon: Check },
  closed:   { label: 'Закрыто',  color: 'bg-paper text-muted',   icon: Check },
};

const CATEGORY_LABELS = {
  technical: 'Тех. вопрос',  billing: 'Финансы',
  account:   'Учётная запись', project: 'Проект', other: 'Прочее',
};

export default function AdminTicketsPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await supportApi.list();
      setTickets(data.results || data);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (activeTicket) {
    return <AdminChat ticketId={activeTicket.id} onBack={() => { setActiveTicket(null); load(); }} />;
  }

  const filtered = tickets.filter((t) => tab === 'all' ? true : t.status === tab);

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Администрирование
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Обращения пользователей
      </h1>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <KPI label="Открытые"   value={tickets.filter((t) => t.status === 'open').length}     accent="orange" />
        <KPI label="Отвеченные" value={tickets.filter((t) => t.status === 'answered').length} accent="violet" />
        <KPI label="Всего"      value={tickets.length}                                         accent="ink" />
      </div>

      <div className="flex gap-1 border-b border-line mb-6">
        <Tab active={tab === 'open'}     onClick={() => setTab('open')}>Открытые</Tab>
        <Tab active={tab === 'answered'} onClick={() => setTab('answered')}>Отвеченные</Tab>
        <Tab active={tab === 'closed'}   onClick={() => setTab('closed')}>Закрытые</Tab>
        <Tab active={tab === 'all'}      onClick={() => setTab('all')}>Все</Tab>
      </div>

      {loading ? <div className="text-muted text-sm">Загрузка...</div>
       : filtered.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center text-muted">
          Обращений нет
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const status = STATUS_LABELS[t.status];
            const Icon = status.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className="w-full bg-white border border-line hover:border-ink p-4 text-left transition-colors grid md:grid-cols-[auto_2fr_1fr_auto] gap-4 items-center"
              >
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                  <Icon size={10} /> {status.label}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{t.subject}</div>
                  <div className="text-xs text-muted truncate mt-0.5">
                    {t.last_message?.body || 'Нет сообщений'}
                  </div>
                </div>
                <div className="text-xs text-muted">
                  <div className="font-mono">{t.user?.full_name_ru || t.user?.username}</div>
                  <div>{CATEGORY_LABELS[t.category]} · {t.messages_count} сообщ.</div>
                </div>
                <div className="text-[11px] text-muted font-mono whitespace-nowrap">
                  {new Date(t.updated_at).toLocaleDateString('ru-RU')}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, accent }) {
  const cls = accent === 'violet' ? 'text-violet' : accent === 'orange' ? 'text-orange' : 'text-ink';
  return (
    <div className="bg-white border border-line p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-3xl font-semibold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function AdminChat({ ticketId, onBack }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  const load = async () => {
    try {
      const t = await supportApi.get(ticketId);
      setTicket(t);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  useEffect(() => { load(); }, [ticketId]); // eslint-disable-line

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      setSubmitting(true);
      const updated = await supportApi.reply(ticketId, reply);
      setTicket(updated);
      setReply('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    } finally { setSubmitting(false); }
  };

  const closeTicket = async () => {
    if (!confirm('Закрыть обращение?')) return;
    try {
      await supportApi.close(ticketId);
      showToast('Обращение закрыто', 'success');
      onBack();
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  if (!ticket) {
    return <div className="px-5 md:px-10 py-12 max-w-4xl mx-auto text-muted text-sm">Загрузка...</div>;
  }

  const status = STATUS_LABELS[ticket.status];

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6">
        <ChevronLeft size={16} /> К списку обращений
      </button>

      <div className="bg-white border border-line">
        <div className="px-6 py-4 border-b border-line flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-xl font-semibold text-ink">{ticket.subject}</div>
            <div className="text-xs text-muted mt-1">
              <span className="font-mono">{ticket.user?.full_name_ru || ticket.user?.username}</span> ·
              {' '}{CATEGORY_LABELS[ticket.category]} ·
              {' '}открыто {new Date(ticket.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
              {status.label}
            </span>
            {ticket.status !== 'closed' && (
              <Button size="sm" variant="ghost" onClick={closeTicket}>Закрыть</Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-paper-2">
          {ticket.messages.map((m) => {
            const isMine = m.author?.id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${isMine ? 'text-right' : ''}`}>
                    <span className={m.is_admin_reply ? 'text-violet font-bold' : 'text-muted'}>
                      {m.is_admin_reply ? 'Поддержка' : (m.author?.full_name_ru || m.author?.username)}
                    </span>
                    <span className="text-muted ml-1.5">
                      {new Date(m.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.is_admin_reply ? 'bg-violet text-white' : 'bg-white border border-line text-ink'
                  }`}>
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {ticket.status !== 'closed' && (
          <div className="border-t border-line p-4 flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
              placeholder="Ответ от имени поддержки... (Ctrl+Enter — отправить)"
              rows={3}
              className="flex-1 px-3 py-2 bg-paper-2 border border-line text-sm focus:outline-none focus:border-ink resize-none"
            />
            <Button variant="violet" icon={Send} disabled={submitting || !reply.trim()} onClick={sendReply}>
              {submitting ? '...' : 'Ответить'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
