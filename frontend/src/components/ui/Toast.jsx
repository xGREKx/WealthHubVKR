import { useEffect } from 'react';
import { CheckCircle2, XCircle, Bell, X } from 'lucide-react';

const COLORS = {
  success: 'bg-violet text-white',
  error:   'bg-[#B23B2C] text-white',
  info:    'bg-ink text-white',
};

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : Bell;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] anim-fade-up ${COLORS[type]} px-5 py-4 max-w-sm shadow-2xl flex items-start gap-3`}>
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div className="text-sm font-medium leading-relaxed">{message}</div>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}
