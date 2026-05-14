import { Shield } from 'lucide-react';
import { RISK_META } from '../../data/constants.js';

export default function RiskBadge({ risk }) {
  if (!risk || !RISK_META[risk]) return null;
  const m = RISK_META[risk];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      <Shield size={11} /> Риск: {m.label}
    </span>
  );
}
