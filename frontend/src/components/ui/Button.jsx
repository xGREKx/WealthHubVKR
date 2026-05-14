export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  const variants = {
    primary: 'bg-orange text-white hover:bg-[#D85F12] active:bg-[#BC4F08]',
    violet:  'bg-violet text-white hover:bg-[#4D2474] active:bg-[#3D1B5E]',
    dark:    'bg-ink text-white hover:bg-ink-soft active:bg-black',
    outline: 'bg-transparent border border-ink text-ink hover:bg-ink hover:text-white',
    ghost:   'bg-transparent text-ink hover:bg-paper',
    light:   'bg-white border border-line text-ink hover:bg-paper-2',
    danger:  'bg-[#B23B2C] text-white hover:bg-[#962E22]',
  };

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {Icon && <Icon size={iconSize} />}
      {children}
      {IconRight && <IconRight size={iconSize} />}
    </button>
  );
}
