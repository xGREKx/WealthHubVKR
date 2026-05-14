export default function ProgressBar({ value, color = '#F07220', height = 6 }) {
  return (
    <div className="w-full bg-paper" style={{ height }}>
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}
