import { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Send, X, ChevronLeft, Clock, Check } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supportApi } from '../api/client.js';

const CATEGORIES = [
  { id: 'technical', label: 'Технический вопрос' },
  { id: 'billing',   label: 'Оплата и финансы' },
  { id: 'account',   label: 'Учётная запись' },
  { id: 'project',   label: 'Вопрос по проекту' },
  { id: 'other',     label: 'Прочее' },
];

const STATUS_LABELS = {
  open:     { label: 'Открыто',  color: 'bg-orange text-white',  icon: Clock },
  answered: { label: 'Отвечено', color: 'bg-violet text-white',  icon: Check },
  closed:   { label: 'Закрыто',  color: 'bg-paper text-muted',   icon: Check },
};

export default function SupportPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets]       = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await supportApi.list();
      setTickets(data.results || data);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  if (activeTicket) {
    return (
      <TicketChat
        ticketId={activeTicket.id}
        onBack={() => { setActiveTicket(null); load(); }}
      />
    );
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
            Поддержка
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            Мои обращения
          </h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
          Новое обращение
        </Button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Загрузка...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center">
          <MessageSquare size={32} className="mx-auto text-muted mb-3" />
          <div className="font-display text-xl font-semibold text-ink mb-2">Нет обращений</div>
          <div className="text-muted text-sm mb-5">
            Если у вас возник вопрос — напишите нам, ответим в течение 24 часов
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Создать обращение
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const status = STATUS_LABELS[t.status];
            const Icon = status.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className="w-full bg-white border border-line hover:border-ink p-4 text-left transition-colors flex items-center gap-4"
              >
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                    <Icon size={10} /> {status.label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{t.subject}</div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    {CATEGORIES.find((c) => c.id === t.category)?.label} ·
                    {' '}{t.messages_count} сообщений
                    {' · '}обновлено {new Date(t.updated_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateTicketModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
            showToast('Обращение отправлено', 'success');
          }}
        />
      )}
    </div>
  );
}

function CreateTicketModal({ onClose, onCreated }) {
  const [subject, setSubject]   = useState('');
  const [category, setCategory] = useState('other');
  const [body, setBody]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!subject || !body) return;
    try {
      setSubmitting(true);
      await supportApi.create({ subject, category, body });
      onCreated();
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative bg-white border border-ink w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="font-display text-lg font-semibold text-ink">Новое обращение</div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Тема*" value={subject} onChange={(e) => setSubject(e.target.value)} />

          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Категория</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink"
            >
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Сообщение*</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Опишите ваш вопрос как можно подробнее"
              className="w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink resize-none"
            />
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" type="button" onClick={onClose}>Отмена</Button>
            <Button variant="primary" className="flex-1" disabled={submitting || !subject || !body}>
              {submitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TicketChat({ ticketId, onBack }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ticket, setTicket]     = useState(null);
  const [reply, setReply]       = useState('');
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
              {CATEGORIES.find((c) => c.id === ticket.category)?.label} ·
              открыто {new Date(ticket.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${status.color} flex-shrink-0`}>
            {status.label}
          </span>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-paper-2">
          {ticket.messages.map((m) => {
            const isMine = m.author?.id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${isMine ? 'text-right' : ''}`}>
                    {m.is_admin_reply ? (
                      <span className="text-violet font-bold">Поддержка Wealth Hub</span>
                    ) : (
                      <span className="text-muted">{m.author?.full_name_ru || m.author?.username}</span>
                    )}
                    <span className="text-muted ml-1.5">
                      {new Date(m.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.is_admin_reply
                      ? 'bg-violet text-white'
                      : isMine
                        ? 'bg-ink text-white'
                        : 'bg-white border border-line text-ink'
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply();
              }}
              placeholder="Ваше сообщение... (Ctrl+Enter — отправить)"
              rows={2}
              className="flex-1 px-3 py-2 bg-paper-2 border border-line text-sm focus:outline-none focus:border-ink resize-none"
            />
            <Button variant="dark" icon={Send} disabled={submitting || !reply.trim()} onClick={sendReply}>
              {submitting ? '...' : 'Отправить'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
