import { Check, Clock, X, FileText } from 'lucide-react';

const META = {
  active:   { label: 'Активный',     bg: 'bg-violet',     fg: 'text-white', Icon: Check     },
  pending:  { label: 'На модерации', bg: 'bg-orange',     fg: 'text-white', Icon: Clock     },
  rejected: { label: 'Отклонён',     bg: 'bg-[#B23B2C]',  fg: 'text-white', Icon: X         },
  closed:   { label: 'Закрыт',       bg: 'bg-ink',        fg: 'text-white', Icon: Check     },
  draft:    { label: 'Черновик',     bg: 'bg-paper',      fg: 'text-ink',   Icon: FileText  },
};

export default function StatusBadge({ status }) {
  const m = META[status] || META.draft;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${m.bg} ${m.fg}`}>
      <Icon size={11} /> {m.label}
    </span>
  );
}
