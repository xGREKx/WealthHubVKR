import { useState, useEffect } from 'react';
import {
  Check, X, FileText, Eye, Star, ShieldCheck, AlertTriangle,
  ArrowLeft, Users, Image as ImageIcon, MapPin, Building2,
  Calendar, TrendingUp, Target, Layers, ExternalLink, Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { INDUSTRIES, PROJECT_TYPES, RISK_META, ATTRACT_META } from '../data/constants.js';
import { formatRub, pct } from '../utils/format.js';
import { useToast } from '../contexts/ToastContext.jsx';
import { projectsApi, mediaUrl } from '../api/client.js';

export default function AdminPage({ onProjectsChanged }) {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('pending');
  const [reviewProject, setReviewProject] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list({ page_size: 200 });
      setProjects(data.results || data);
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const pending  = projects.filter((p) => p.status === 'pending');
  const active   = projects.filter((p) => p.status === 'active');
  const rejected = projects.filter((p) => p.status === 'rejected');

  if (reviewProject) {
    return (
      <ReviewProjectPage
        projectId={reviewProject.id}
        onBack={() => { setReviewProject(null); load(); }}
        onModerated={() => {
          load();
          onProjectsChanged && onProjectsChanged();
          setReviewProject(null);
        }}
      />
    );
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Администрирование
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-8">
        Модерация проектов
      </h1>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <KPI label="На модерации" value={pending.length}  accent="orange" />
        <KPI label="Активных"     value={active.length}   accent="violet" />
        <KPI label="Отклонённых"  value={rejected.length} accent="ink" />
      </div>

      <div className="flex gap-1 border-b border-line mb-6">
        <Tab active={tab === 'pending'}  onClick={() => setTab('pending')}>На модерации ({pending.length})</Tab>
        <Tab active={tab === 'active'}   onClick={() => setTab('active')}>Активные ({active.length})</Tab>
        <Tab active={tab === 'rejected'} onClick={() => setTab('rejected')}>Отклонённые ({rejected.length})</Tab>
      </div>

      {loading ? <div className="text-muted text-sm">Загрузка...</div>
       : (() => {
         const list = tab === 'pending' ? pending : tab === 'active' ? active : rejected;
         if (list.length === 0) {
           return (
             <div className="bg-white border border-line p-12 text-center">
               <div className="font-display text-xl font-semibold text-ink mb-2">Нет проектов</div>
               <div className="text-muted text-sm">В этой категории пока пусто</div>
             </div>
           );
         }
         return (
           <div className="space-y-3">
             {list.map((p) => (
               <ProjectRow key={p.id} project={p} onReview={() => setReviewProject(p)} />
             ))}
           </div>
         );
       })()}
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

function ProjectRow({ project, onReview }) {
  return (
    <div className="bg-white border border-line p-5 grid md:grid-cols-[2fr_1fr_auto] gap-4 items-center">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-display text-lg font-semibold text-ink">{project.name}</span>
          <StatusBadge status={project.status} />
        </div>
        <div className="text-xs text-muted">{project.slogan}</div>
        <div className="text-xs text-muted mt-1.5">
          {INDUSTRIES.find((i) => i.id === project.industry)?.label} ·{' '}
          {PROJECT_TYPES.find((t) => t.id === project.type)?.label} · {project.geography || '—'}
        </div>
      </div>
      <div className="text-sm">
        <div className="text-[10px] uppercase tracking-wider text-muted">Цель</div>
        <div className="font-display font-semibold text-ink">{formatRub(project.goal)} ₽</div>
        <div className="text-[10px] text-muted mt-2">
          Создан {new Date(project.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>
      <Button variant="dark" size="sm" icon={Eye} onClick={onReview}>
        Изучить
      </Button>
    </div>
  );
}

/**
 * Полная страница изучения проекта модератором.
 * Показывает всё: описание, финансы, команду с CV, документы для скачивания.
 * В конце — действия одобрения / отклонения с указанием риска.
 */
function ReviewProjectPage({ projectId, onBack, onModerated }) {
  const { showToast } = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk]       = useState('medium');
  const [attract, setAttract] = useState('medium');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [recoLoading, setRecoLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    projectsApi.get(projectId)
      .then((p) => {
        setProject(p);
        if (p.risk) setRisk(p.risk);
        if (p.attractiveness) setAttract(p.attractiveness);
      })
      .catch((e) => showToast(e.message || 'Ошибка', 'error'))
      .finally(() => setLoading(false));
  }, [projectId, showToast]);

  // Подгружаем рекомендацию системы для проектов на модерации.
  // Если у проекта ещё не выставлены risk/attractiveness — подставляем
  // предложение системы как значения по умолчанию в форме.
  useEffect(() => {
    if (!project || project.status !== 'pending') return;
    setRecoLoading(true);
    projectsApi.recommendation(projectId)
      .then((reco) => {
        setRecommendation(reco);
        if (!project.risk && reco?.risk?.level) setRisk(reco.risk.level);
        if (!project.attractiveness && reco?.attractiveness_preview?.level) {
          setAttract(reco.attractiveness_preview.level);
        }
      })
      .catch((e) => showToast(e.message || 'Не удалось получить рекомендацию', 'error'))
      .finally(() => setRecoLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.status]);

  const moderate = async (action) => {
    if (action === 'reject' && !comment.trim()) {
      showToast('При отклонении укажите причину в комментарии', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await projectsApi.moderate(projectId, {
        action,
        risk: action === 'approve' ? risk : undefined,
        attractiveness: action === 'approve' ? attract : undefined,
        comment,
      });
      showToast(action === 'approve' ? 'Проект одобрен и опубликован' : 'Проект отклонён', 'success');
      onModerated();
    } catch (e) {
      showToast(e.message || 'Ошибка модерации', 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="px-5 md:px-10 py-12 max-w-6xl mx-auto text-muted text-sm">Загрузка проекта...</div>;
  }
  if (!project) return null;

  const industry = INDUSTRIES.find((i) => i.id === project.industry)?.label;
  const type     = PROJECT_TYPES.find((t) => t.id === project.type)?.label;
  const isPending = project.status === 'pending';

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-6xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6">
        <ArrowLeft size={16} /> К списку проектов
      </button>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2 flex items-center gap-2">
            Заявка от {project.owner?.full_name_ru || project.owner?.username}
            <span className="text-violet">·</span>
            {new Date(project.created_at).toLocaleDateString('ru-RU')}
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-ink">
            {project.name}
          </h1>
          <p className="mt-3 text-lg text-ink-soft italic">{project.slogan}</p>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <StatusBadge status={project.status} />
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-paper text-ink">
              {industry} · {type}
            </span>
          </div>

          {project.cover_url && (
            <div className="mt-6">
              <img src={mediaUrl(project.cover_url)} alt="" className="w-full max-h-80 object-cover border border-line" />
            </div>
          )}

          {/* Описание */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold text-ink mb-3">Краткое описание</h2>
            <p className="text-ink leading-relaxed whitespace-pre-line">{project.description}</p>
          </div>

          {/* Команда */}
          {project.team && project.team.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                <Users size={20} /> Команда ({project.team.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {project.team.map((m) => (
                  <div key={m.id} className="bg-white border border-line p-4">
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
                            <FileText size={11} /> CV (PDF) <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Документы */}
          {project.documents && project.documents.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                <FileText size={20} /> Документы ({project.documents.length})
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
                        <Button variant="light" size="sm" icon={ExternalLink}>Открыть</Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Подробное описание */}
          {project.full_content && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink mb-4">Подробное описание</h2>
              <div
                className="bg-white border border-line p-6 prose-content text-ink leading-relaxed"
                dangerouslySetInnerHTML={{ __html: project.full_content }}
              />
            </div>
          )}

          {/* Признаки для отклонения */}
          {project.status === 'rejected' && project.moderation_comment && (
            <div className="mt-10 bg-[#FBE6E3] border-l-4 border-[#B23B2C] p-4">
              <div className="font-semibold text-[#B23B2C] mb-1">Причина отклонения</div>
              <div className="text-sm text-ink">{project.moderation_comment}</div>
            </div>
          )}
        </div>

        {/* Sidebar — действия модератора */}
        <aside className="lg:sticky lg:top-[80px] h-fit space-y-4">
          {/* Финансы */}
          <div className="bg-white border border-line p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">
              Финансовые параметры
            </div>
            <div className="space-y-3">
              <Metric icon={Target}     label="Цель сбора"          value={`${formatRub(project.goal)} ₽`} />
              <Metric icon={Layers}     label="Минимум"              value={`${formatRub(project.min_investment)} ₽`} />
              <Metric icon={TrendingUp} label="Доходность годовых"   value={`${project.expected_return}%`} accent="violet" />
              <Metric icon={Calendar}   label="Окупаемость"          value={`${project.payback_years} г.`} />
              <Metric icon={MapPin}     label="География"            value={project.geography || '—'} />
            </div>

            {project.status === 'active' && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="text-xs uppercase tracking-wider text-muted">Уже собрано</div>
                  <div className="font-mono font-semibold text-ink text-sm">
                    {pct(project.raised, project.goal).toFixed(1)}%
                  </div>
                </div>
                <ProgressBar value={pct(project.raised, project.goal)} />
              </div>
            )}
          </div>

          {/* Рекомендация системы — показываем только для проектов на модерации */}
          {isPending && (recoLoading || recommendation) && (
            <div className="bg-paper-2 border-2 border-violet/40 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-violet" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-violet font-bold">
                  Рекомендация системы
                </span>
              </div>

              {recoLoading && (
                <div className="text-xs text-muted">Анализ параметров проекта…</div>
              )}

              {!recoLoading && recommendation && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white border border-line p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Уровень риска</div>
                      <div className="text-lg font-bold text-ink">
                        {recommendation.risk.level_label}
                      </div>
                      <div className="text-[10px] text-muted mt-1">
                        балл {recommendation.risk.score} из 2
                      </div>
                    </div>
                    <div className="bg-white border border-line p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Привлекательность</div>
                      <div className="text-lg font-bold text-ink">
                        {recommendation.attractiveness_preview.level_label}
                      </div>
                      <div className="text-[10px] text-muted mt-1">
                        балл {recommendation.attractiveness_preview.score} из 1
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] uppercase tracking-wider text-muted mb-2 font-semibold">
                    Факторы оценки риска
                  </div>
                  <div className="space-y-1 mb-3">
                    {recommendation.risk.factors.map((f) => {
                      const verdictColor = {
                        low:    'text-emerald-700',
                        medium: 'text-amber-700',
                        high:   'text-rose-700',
                      }[f.verdict] || 'text-muted';
                      const verdictLabel = { low: 'низкий', medium: 'средний', high: 'высокий' }[f.verdict] || f.verdict;
                      return (
                        <div key={f.code} className="flex justify-between items-center text-xs py-1 border-b border-line/40 last:border-b-0">
                          <span className="text-ink">{f.label}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted text-[11px]">{f.value}</span>
                            <span className={`font-semibold ${verdictColor} text-[11px] min-w-[55px] text-right`}>
                              {verdictLabel}
                            </span>
                            <span className="text-muted text-[10px] w-7 text-right">×{f.weight}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-muted italic leading-relaxed">
                    Финальное решение остаётся за модератором. Поля ниже предзаполнены
                    значениями системы — их можно изменить перед публикацией.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Решение модератора */}
          {isPending ? (
            <div className="bg-white border border-ink p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet font-semibold mb-3">
                Решение модератора
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted mb-2">Уровень риска</div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(RISK_META).map(([k, v]) => (
                    <button key={k} onClick={() => setRisk(k)}
                            className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                              risk === k ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink hover:border-ink'
                            }`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted mb-2">Привлекательность</div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ATTRACT_META).map(([k, v]) => (
                    <button key={k} onClick={() => setAttract(k)}
                            className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors flex items-center justify-center gap-1 ${
                              attract === k ? 'bg-violet text-white border-violet' : 'bg-white border-line text-ink hover:border-ink'
                            }`}>
                      <Star size={10} /> {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Комментарий <span className="text-muted normal-case">(обязателен при отклонении)</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-paper-2 border border-line text-sm focus:outline-none focus:border-ink resize-none"
                  placeholder="Заметки для команды или причина отклонения"
                />
              </div>

              <div className="space-y-2">
                <Button variant="violet" className="w-full" icon={Check}
                        onClick={() => moderate('approve')} disabled={submitting}>
                  Одобрить и опубликовать
                </Button>
                <Button variant="ghost" className="w-full" icon={X}
                        onClick={() => moderate('reject')} disabled={submitting}>
                  Отклонить
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-line p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">
                Текущий статус
              </div>
              <StatusBadge status={project.status} />
              {project.risk && (
                <div className="mt-4 text-sm">
                  <span className="text-muted">Риск: </span>
                  <span className="font-semibold text-ink">{RISK_META[project.risk]?.label}</span>
                </div>
              )}
              {project.attractiveness && (
                <div className="mt-1 text-sm">
                  <span className="text-muted">Привлекательность: </span>
                  <span className="font-semibold text-ink">{ATTRACT_META[project.attractiveness]}</span>
                </div>
              )}
              {project.moderator && (
                <div className="mt-3 text-xs text-muted">
                  Модератор: {project.moderator.full_name_ru || project.moderator.username}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  const cls = accent === 'violet' ? 'text-violet' : 'text-ink';
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-muted flex-shrink-0" />
      <span className="text-muted flex-1">{label}</span>
      <span className={`font-semibold ${cls}`}>{value}</span>
    </div>
  );
}
