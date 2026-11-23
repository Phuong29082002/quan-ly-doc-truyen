// Thanh ngang xếp hạng (doanh thu theo gói, theo truyện, thể loại): tên bên trái, giá trị bên phải
export default function RankBars({ title, items, format, empty }: {
  title: string; items: { name: string; value: number; note?: string }[]; format: (v: number) => string; empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="font-medium text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((i) => (
            <li key={i.name} title={`${i.name}: ${format(i.value)}${i.note ? `, ${i.note}` : ""}`}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-gray-700">{i.name}</span>
                <span className="shrink-0 tabular-nums text-gray-900">{format(i.value)}{i.note && <span className="ml-1 text-xs text-gray-500">({i.note})</span>}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
