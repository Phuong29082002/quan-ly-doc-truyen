interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  const btn = "min-w-9 rounded border px-3 py-1.5 text-sm disabled:opacity-40";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-1">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
          <button
            className={`${btn} ${p === page ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        </span>
      ))}
      <button className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
