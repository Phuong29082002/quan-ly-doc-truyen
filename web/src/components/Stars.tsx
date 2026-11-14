// PB49: hiển thị điểm sao (có nửa sao) bằng hai lớp ký tự chồng nhau
export default function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span aria-label={`${value.toFixed(1)} trên 5 sao`} role="img" className={`relative inline-block leading-none tracking-[0.1em] ${className}`} style={{ fontSize: size }}>
      <span aria-hidden className="text-gray-300">★★★★★</span>
      <span aria-hidden className="absolute inset-0 overflow-hidden text-lamp" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
