import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, FileText, Eye, AlertTriangle, Megaphone, Users, X, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { formatRub, pct } from '../utils/format.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { projectsApi } from '../api/client.js';

export default function EntrepreneurPage({ onProjectsChanged, onOpenProject, onEditProject, onCreateProject }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [investorsModal, setInvestorsModal] = useState(null); // { project, data, loading }

  const load = async () => {
    setLoading(true);
    try {
      // Запрашиваем все проекты текущего пользователя независимо от статуса
      // (черновики, на модерации, активные, отклонённые) через ?mine=1.
      const data = await projectsApi.listMine();
      const all = data.results || data;
      setMyProjects(all);
    } catch (e) {
      showToast(e.message || 'Не удалось загрузить', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const handleDelete = async (id) => {
    if (!confirm('Удалить проект? Это действие необратимо.')) return;
    try {
      await projectsApi.delete(id);
      showToast('Проект удалён', 'info');
      load();
      onProjectsChanged && onProjectsChanged();
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const openInvestors = async (project) => {
    setInvestorsModal({ project, data: null, loading: true });
    try {
      const data = await projectsApi.investors(project.id);
      setInvestorsModal({ project, data, loading: false });
    } catch (e) {
      showToast(e.message || 'Не удалось загрузить инвесторов', 'error');
      setInvestorsModal(null);
    }
  };

  const stats = {
    active:  myProjects.filter((p) => p.status === 'active').length,
    pending: myProjects.filter((p) => p.status === 'pending').length,
    rejected: myProjects.filter((p) => p.status === 'rejected').length,
    totalRaised: myProjects.reduce((s, p) => s + (Number(p.raised) || 0), 0),
  };

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
            Предприниматель · {user?.last_name_ru} {user?.first_name_ru?.[0]}.
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            Мои проекты
          </h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={onCreateProject}>
          Подать заявку на проект
        </Button>
      </div>

      {/* KPI */}
      {myProjects.length > 0 && (
        <div className="grid sm:grid-cols-4 gap-3 mb-8">
          <KpiCard label="Активных"      value={stats.active}   accent="violet" />
          <KpiCard label="На модерации"  value={stats.pending}  accent="orange" />
          <KpiCard label="Отклонённых"   value={stats.rejected} accent="ink" />
          <KpiCard label="Всего собрано" value={`${formatRub(stats.totalRaised)} ₽`} accent="ink" />
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm">Загрузка...</div>
      ) : myProjects.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center">
          <div className="font-display text-xl font-semibold text-ink mb-2">У вас пока нет проектов</div>
          <div className="text-muted text-sm mb-5 max-w-md mx-auto">
            Подайте заявку на новый проект — модераторы рассмотрят её в течение 3 рабочих дней.
            После одобрения проект появится на витрине.
          </div>
          <Button variant="primary" icon={Plus} onClick={onCreateProject}>
            Создать первый проект
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {myProjects.map((p) => (
            <div key={p.id} className="bg-white border border-line p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-semibold text-ink leading-tight truncate">{p.name}</div>
                  <div className="text-xs text-muted mt-1 line-clamp-2">{p.slogan}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.status === 'rejected' && p.moderation_comment && (
                <div className="bg-[#FBE6E3] border-l-2 border-[#B23B2C] p-2.5 mb-3">
                  <div className="flex gap-2 text-xs">
                    <AlertTriangle size={12} className="text-[#B23B2C] flex-shrink-0 mt-0.5" />
                    <span className="text-ink leading-snug">{p.moderation_comment}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t border-line">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Цель</div>
                  <div className="font-semibold text-ink">{formatRub(p.goal)} ₽</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Минимум</div>
                  <div className="font-semibold text-ink">{formatRub(p.min_investment)} ₽</div>
                </div>
              </div>

              {p.status === 'active' && (
                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="text-xs text-muted">Прогресс сбора</div>
                    <div className="font-mono font-semibold text-ink text-xs">
                      {pct(p.raised, p.goal).toFixed(0)}% · {formatRub(p.raised)} ₽
                    </div>
                  </div>
                  <ProgressBar value={pct(p.raised, p.goal)} height={4} />
                </div>
              )}

              {p.promoted && (
                <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-orange-tint border border-orange/30 text-[10px] uppercase tracking-wider font-bold text-orange">
                  <Megaphone size={10} /> Продвигается
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <Button variant="light" size="sm" icon={Eye} className="flex-1" onClick={() => onOpenProject(p)}>
                  Открыть
                </Button>
                {p.status === 'active' && Number(p.raised) > 0 && (
                  <Button variant="light" size="sm" icon={Users} onClick={() => openInvestors(p)}>
                    Инвесторы
                  </Button>
                )}
                <Button variant="light" size="sm" icon={Edit3} onClick={() => onEditProject(p.id)}>
                  Изменить
                </Button>
                {(p.status === 'draft' || p.status === 'rejected') && (
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(p.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {investorsModal && (
        <InvestorsModal
          project={investorsModal.project}
          data={investorsModal.data}
          loading={investorsModal.loading}
          onClose={() => setInvestorsModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Модал со списком инвесторов проекта
// ---------------------------------------------------------------------------
function InvestorsModal({ project, data, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>

        {/* Шапка модала */}
        <div className="flex items-start justify-between p-6 border-b border-line">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-1">
              Инвесторы проекта
            </div>
            <h2 className="font-display text-xl font-semibold text-ink leading-tight">
              {project.name}
            </h2>
            {data && (
              <div className="text-sm text-muted mt-2">
                {data.investors_count} {investorWord(data.investors_count)} ·
                собрано {formatRub(data.total_raised)} ₽
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6">
          {loading && (
            <div className="text-center text-muted py-8">Загрузка…</div>
          )}

          {!loading && data && data.investors.length === 0 && (
            <div className="text-center text-muted py-8">
              В этот проект пока не инвестировал ни один пользователь.
            </div>
          )}

          {!loading && data && data.investors.length > 0 && (
            <>
              {/* Шапка таблицы */}
              <div className="grid grid-cols-12 gap-3 px-3 pb-2 text-[10px] uppercase tracking-wider text-muted font-semibold border-b border-line">
                <div className="col-span-5">Инвестор</div>
                <div className="col-span-3 text-right">Вклад, ₽</div>
                <div className="col-span-2 text-right">Доля</div>
                <div className="col-span-2 text-right">С</div>
              </div>

              {/* Строки */}
              <div className="divide-y divide-line">
                {data.investors.map((inv, idx) => (
                  <div key={inv.investor_id}
                       className="grid grid-cols-12 gap-3 px-3 py-3 items-center hover:bg-paper-2 transition-colors">
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 bg-violet/10 text-violet text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">
                          {inv.full_name}
                        </div>
                        {inv.esia_verified && (
                          <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                            <ShieldCheck size={10} /> ЕСИА
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 text-right font-mono text-sm text-ink font-semibold">
                      {formatRub(inv.amount)}
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm text-violet font-bold">
                      {inv.share_pct.toFixed(1)}%
                    </div>
                    <div className="col-span-2 text-right text-xs text-muted">
                      {inv.first_invested_at
                        ? new Date(inv.first_invested_at).toLocaleDateString('ru-RU',
                            { day: '2-digit', month: 'short' })
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Сводка по сумме процентов — для контроля */}
              <div className="mt-4 px-3 py-2 bg-paper-2 text-[11px] text-muted flex justify-between">
                <span>Всего долей</span>
                <span className="font-mono font-semibold">
                  {data.investors.reduce((s, i) => s + i.share_pct, 0).toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Простое русское склонение для «инвестор / инвестора / инвесторов»
function investorWord(n) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'инвесторов';
  if (last === 1) return 'инвестор';
  if (last >= 2 && last <= 4) return 'инвестора';
  return 'инвесторов';
}

function KpiCard({ label, value, accent }) {
  const cls = accent === 'violet' ? 'text-violet' : accent === 'orange' ? 'text-orange' : 'text-ink';
  return (
    <div className="bg-white border border-line p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-2xl font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
