export default function Field({
  label, value, onChange, type = 'text', placeholder, readOnly, hint, className = '',
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">
          {label}
        </span>
      )}
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-4 py-3 bg-white border border-line text-ink focus:outline-none focus:border-ink transition-colors ${readOnly ? 'bg-paper-2 cursor-default' : ''}`}
      />
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}
