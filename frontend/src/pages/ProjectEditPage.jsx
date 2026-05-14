import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Send, Trash2, Plus, Upload, FileText, Image as ImageIcon,
  Users, AlertTriangle, X, Eye, ChevronDown,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { projectsApi, mediaUrl } from '../api/client.js';
import { INDUSTRIES, PROJECT_TYPES } from '../data/constants.js';

const EMPTY_FORM = {
  name: '', slogan: '', description: '', full_content: '',
  industry: 'it', type: 'startup', geography: '',
  goal: '', min_investment: '', expected_return: '', payback_years: 3,
};

export default function ProjectEditPage({ projectId, onBack, onSaved }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isNew = !projectId;
  const [form, setForm]               = useState(EMPTY_FORM);
  const [coverFile, setCoverFile]     = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [project, setProject]         = useState(null);
  const [loading, setLoading]         = useState(!isNew);
  const [saving, setSaving]           = useState(false);
  const [team, setTeam]               = useState([]);
  const [documents, setDocuments]     = useState([]);
  const [showFullEdit, setShowFullEdit] = useState(false);

  const coverInputRef = useRef(null);

  // === Загрузка существующего проекта ===
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    projectsApi.get(projectId)
      .then((p) => {
        setProject(p);
        setForm({
          name: p.name || '',
          slogan: p.slogan || '',
          description: p.description || '',
          full_content: p.full_content || '',
          industry: p.industry,
          type: p.type,
          geography: p.geography || '',
          goal: p.goal || '',
          min_investment: p.min_investment || '',
          expected_return: p.expected_return || '',
          payback_years: p.payback_years || 3,
        });
        setTeam(p.team || []);
        setDocuments(p.documents || []);
        if (p.cover_url) setCoverPreview(p.cover_url);
      })
      .catch((e) => showToast(e.message || 'Не удалось загрузить проект', 'error'))
      .finally(() => setLoading(false));
  }, [projectId, isNew, showToast]);

  const update = (k) => (v) => setForm({ ...form, [k]: v });

  const onCoverSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // === Сохранение ===
  const handleSave = async () => {
    if (!form.name || !form.description || !form.goal) {
      showToast('Заполните название, описание и цель сбора', 'error');
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          fd.append(k, v);
        }
      });
      if (coverFile) fd.append('cover_image', coverFile);

      let saved;
      if (isNew) {
        saved = await projectsApi.create(fd);
        showToast('Проект создан и отправлен на модерацию', 'success');
      } else {
        saved = await projectsApi.update(projectId, fd);
        showToast(
          project?.status === 'active'
            ? 'Изменения отправлены на повторную модерацию. Инвесторы получили уведомление.'
            : 'Изменения сохранены',
          'success'
        );
      }
      onSaved && onSaved(saved);
    } catch (e) {
      showToast(e.message || 'Не удалось сохранить', 'error');
    } finally { setSaving(false); }
  };

  // === Команда ===
  const addTeamMember = async (data, cvFile) => {
    if (isNew) {
      showToast('Сначала сохраните проект — потом можно добавить команду', 'info');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('role', data.role);
      fd.append('bio', data.bio || '');
      if (cvFile) fd.append('cv_file', cvFile);
      const member = await projectsApi.addTeam(projectId, fd);
      setTeam([...team, member]);
      showToast('Сотрудник добавлен', 'success');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const deleteTeamMember = async (memberId) => {
    if (!confirm('Удалить участника команды?')) return;
    try {
      await projectsApi.deleteTeam(projectId, memberId);
      setTeam(team.filter((m) => m.id !== memberId));
      showToast('Удалено', 'info');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  // === Документы ===
  const addDocument = async (file, type) => {
    if (isNew) {
      showToast('Сначала сохраните проект — потом можно загрузить документы', 'info');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('type', type);
      const doc = await projectsApi.addDocument(projectId, fd);
      setDocuments([...documents, doc]);
      showToast('Документ загружен', 'success');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await projectsApi.deleteDocument(projectId, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      showToast('Удалено', 'info');
    } catch (e) {
      showToast(e.message || 'Ошибка', 'error');
    }
  };

  if (loading) {
    return <div className="px-5 md:px-10 py-12 max-w-5xl mx-auto text-muted text-sm">Загрузка...</div>;
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6">
        <ArrowLeft size={16} /> К списку проектов
      </button>

      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
            {isNew ? 'Новый проект' : `Проект · ${project?.status === 'active' ? 'Активный' : project?.status === 'pending' ? 'На модерации' : project?.status === 'rejected' ? 'Отклонён' : 'Черновик'}`}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            {isNew ? 'Создание проекта' : 'Редактирование проекта'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>Отмена</Button>
          <Button variant="primary" icon={isNew ? Send : Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняем...' :
              isNew ? 'Отправить на модерацию' :
              project?.status === 'active' ? 'Сохранить и обновить' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {!isNew && project?.status === 'active' && (
        <div className="mb-6 bg-orange-tint border-l-4 border-orange p-4 flex gap-3">
          <AlertTriangle size={20} className="text-orange flex-shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            <strong>Важно:</strong> При изменении активного проекта он автоматически уйдёт на повторную модерацию,
            а все инвесторы получат уведомление об изменениях.
          </div>
        </div>
      )}

      {!isNew && project?.status === 'rejected' && project?.moderation_comment && (
        <div className="mb-6 bg-[#FBE6E3] border-l-4 border-[#B23B2C] p-4">
          <div className="font-semibold text-[#B23B2C] mb-1">Проект отклонён модератором</div>
          <div className="text-sm text-ink">{project.moderation_comment}</div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Основная форма */}
        <div className="space-y-6">
          {/* Обложка */}
          <Section title="Обложка проекта">
            <input type="file" accept="image/*" ref={coverInputRef} onChange={onCoverSelected} className="hidden" />
            <div className="flex gap-4 items-start">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="w-40 h-32 bg-paper-2 border border-line hover:border-ink transition-colors overflow-hidden flex items-center justify-center"
              >
                {coverPreview ? (
                  <img
                    src={coverPreview.startsWith('data:') ? coverPreview : mediaUrl(coverPreview)}
                    alt="" className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={32} className="text-muted" />
                )}
              </button>
              <div className="flex-1 text-xs text-muted">
                <div className="mb-2">Рекомендуемый размер: 1200×600 px, JPG или PNG.</div>
                <Button size="sm" variant="light" icon={Upload} onClick={() => coverInputRef.current?.click()}>
                  Выбрать файл
                </Button>
                {coverPreview && (
                  <button
                    onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                    className="ml-2 text-xs text-[#B23B2C] hover:underline"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Основная информация */}
          <Section title="Основная информация">
            <div className="space-y-4">
              <Field label="Название проекта*" value={form.name} onChange={(e) => update('name')(e.target.value)} placeholder="Краткое и запоминающееся" />
              <Field label="Слоган" value={form.slogan} onChange={(e) => update('slogan')(e.target.value)} placeholder="Одной фразой о проекте" />

              <label className="block">
                <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Краткое описание*</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description')(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink resize-none"
                  placeholder="2–3 абзаца о проекте, что вы делаете и почему это важно"
                />
              </label>
            </div>
          </Section>

          {/* Подробное описание */}
          <Section title="Подробное описание (необязательно)" expandable defaultExpanded={!!form.full_content}>
            <label className="block">
              <span className="block text-xs text-muted mb-2">
                Можно использовать HTML-разметку (заголовки, списки, ссылки). Будет показано на странице проекта в блоке «Подробно».
              </span>
              <textarea
                value={form.full_content}
                onChange={(e) => update('full_content')(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink resize-y font-mono text-sm"
                placeholder="<h2>Бизнес-модель</h2><p>...</p><ul><li>...</li></ul>"
              />
            </label>
          </Section>

          {/* Категории */}
          <Section title="Категория и география">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Отрасль*" value={form.industry} onChange={update('industry')}
                options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} />
              <Select label="Тип проекта*" value={form.type} onChange={update('type')}
                options={PROJECT_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
            </div>
            <Field label="География" value={form.geography} onChange={(e) => update('geography')(e.target.value)} placeholder="Москва, СПб, или 'Вся РФ'" hint="Регион ведения деятельности" />
          </Section>

          {/* Финансы */}
          <Section title="Финансовые параметры">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Цель сбора, ₽*"  type="number" value={form.goal}
                onChange={(e) => update('goal')(e.target.value)} placeholder="5000000" />
              <Field label="Минимальная сумма, ₽*" type="number" value={form.min_investment}
                onChange={(e) => update('min_investment')(e.target.value)} placeholder="50000" />
              <Field label="Ожидаемая доходность, % годовых*" type="number" value={form.expected_return}
                onChange={(e) => update('expected_return')(e.target.value)} placeholder="25" hint="0–100%" />
              <Field label="Срок окупаемости, лет*" type="number" value={form.payback_years}
                onChange={(e) => update('payback_years')(e.target.value)} placeholder="3" />
            </div>
          </Section>

          {/* Команда */}
          {!isNew && (
            <Section title={`Команда (${team.length})`}>
              <TeamEditor
                team={team}
                onAdd={addTeamMember}
                onDelete={deleteTeamMember}
              />
            </Section>
          )}

          {/* Документы */}
          {!isNew && (
            <Section title={`Документы (${documents.length})`}>
              <DocumentsEditor
                documents={documents}
                onUpload={addDocument}
                onDelete={deleteDocument}
              />
            </Section>
          )}
        </div>

        {/* Сайдбар */}
        <aside className="space-y-4">
          <div className="bg-white border border-line p-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">
              Чек-лист
            </div>
            <ul className="space-y-2 text-sm">
              <CheckItem done={!!form.name}>Название</CheckItem>
              <CheckItem done={!!form.description}>Описание</CheckItem>
              <CheckItem done={!!form.goal && !!form.min_investment && !!form.expected_return}>Финансы</CheckItem>
              <CheckItem done={!!form.geography}>География</CheckItem>
              <CheckItem done={!!coverPreview}>Обложка</CheckItem>
              {!isNew && <>
                <CheckItem done={team.length > 0}>Команда (минимум 1)</CheckItem>
                <CheckItem done={documents.length > 0}>Документы</CheckItem>
              </>}
            </ul>
          </div>

          <div className="bg-violet-tint border border-violet/20 p-4 text-xs text-ink leading-relaxed">
            <strong className="block mb-1 text-violet">Что дальше?</strong>
            После сохранения проект уйдёт на модерацию. Срок рассмотрения — до 3 рабочих дней.
            Решение модератора придёт уведомлением.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children, expandable, defaultExpanded = true }) {
  const [open, setOpen] = useState(defaultExpanded);
  const isOpen = expandable ? open : true;

  return (
    <div className="bg-white border border-line">
      <div className={`px-5 py-3 border-b border-line flex items-center justify-between ${expandable ? 'cursor-pointer' : ''}`}
           onClick={() => expandable && setOpen(!open)}>
        <div className="font-display text-base font-semibold text-ink">{title}</div>
        {expandable && (
          <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink cursor-pointer"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function CheckItem({ done, children }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-violet border-violet' : 'bg-white border-line'
      }`}>
        {done && <span className="text-white text-[9px] leading-none">✓</span>}
      </span>
      <span className={done ? 'text-ink' : 'text-muted'}>{children}</span>
    </li>
  );
}

function TeamEditor({ team, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('');
  const [bio, setBio]       = useState('');
  const [cvFile, setCvFile] = useState(null);

  const submit = async () => {
    if (!name || !role) return;
    await onAdd({ name, role, bio }, cvFile);
    setName(''); setRole(''); setBio(''); setCvFile(null);
    setAdding(false);
  };

  return (
    <div>
      {team.length === 0 && !adding && (
        <div className="text-sm text-muted mb-3">Добавьте ключевых членов команды с указанием их роли и опыта.</div>
      )}

      <div className="space-y-2 mb-3">
        {team.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-paper-2 border border-line-soft p-3">
            <div className="w-9 h-9 bg-orange-soft flex-shrink-0 flex items-center justify-center font-display font-bold text-ink text-xs">
              {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink">{m.name}</div>
              <div className="text-xs text-violet font-semibold">{m.role}</div>
              {m.bio && <div className="text-xs text-muted truncate">{m.bio}</div>}
            </div>
            {m.cv_url && (
              <a href={mediaUrl(m.cv_url)} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-violet hover:text-orange flex items-center gap-1 flex-shrink-0">
                <FileText size={12} /> CV
              </a>
            )}
            <button onClick={() => onDelete(m.id)} className="text-muted hover:text-[#B23B2C]">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-paper-2 border border-line p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ФИО*" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" />
            <Field label="Должность*" value={role} onChange={(e) => setRole(e.target.value)} placeholder="CEO, CTO, ..." />
          </div>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Краткая биография</span>
            <textarea
              value={bio} onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-line text-sm focus:outline-none focus:border-ink resize-none"
              placeholder="Опыт работы, достижения"
            />
          </label>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">CV в PDF (необязательно)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="text-xs text-muted file:mr-3 file:px-3 file:py-1.5 file:bg-ink file:text-white file:border-0 file:cursor-pointer hover:file:bg-ink-soft"
            />
            {cvFile && <div className="text-xs text-violet mt-1">Выбрано: {cvFile.name}</div>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Отмена</Button>
            <Button variant="primary" size="sm" disabled={!name || !role} onClick={submit}>Добавить</Button>
          </div>
        </div>
      ) : (
        <Button variant="light" size="sm" icon={Plus} onClick={() => setAdding(true)}>
          Добавить участника команды
        </Button>
      )}
    </div>
  );
}

function DocumentsEditor({ documents, onUpload, onDelete }) {
  const inputRef = useRef(null);
  const [docType, setDocType] = useState('business_plan');

  const TYPES = [
    { value: 'business_plan',   label: 'Бизнес-план' },
    { value: 'financial_model', label: 'Финансовая модель' },
    { value: 'presentation',    label: 'Презентация' },
    { value: 'other',           label: 'Прочее' },
  ];

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file, docType);
    e.target.value = '';
  };

  return (
    <div>
      {documents.length === 0 && (
        <div className="text-sm text-muted mb-3">Загрузите бизнес-план, финансовую модель и презентацию для инвесторов.</div>
      )}

      <div className="space-y-2 mb-3">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-3 bg-paper-2 border border-line-soft p-3">
            <div className="w-9 h-9 bg-white flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-violet" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink truncate">{d.name}</div>
              <div className="text-[11px] text-muted">
                {TYPES.find((t) => t.value === d.type)?.label} · {(d.size_bytes / 1024 / 1024).toFixed(2)} МБ
              </div>
            </div>
            {d.file_url && (
              <a href={mediaUrl(d.file_url)} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-violet hover:text-orange flex items-center gap-1">
                <Eye size={12} /> Открыть
              </a>
            )}
            <button onClick={() => onDelete(d.id)} className="text-muted hover:text-[#B23B2C]">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <span className="block text-[11px] uppercase tracking-wider text-muted mb-1">Тип документа</span>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-line text-sm focus:outline-none focus:border-ink"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <input type="file" ref={inputRef} onChange={onFileSelected} className="hidden" />
        <Button variant="light" icon={Upload} onClick={() => inputRef.current?.click()}>
          Загрузить
        </Button>
      </div>
    </div>
  );
}
