export default function Card({ children, className = '', padded = true, ...rest }) {
  return (
    <div
      className={`bg-white border border-line ${padded ? 'p-6' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
