import type { AccessType } from "../api/types";
import { formatPrice } from "../utils/format";

interface Props {
  accessType: AccessType;
  price?: number;
  freeChapterCount?: number;
}

// PB16, PB17: nhãn hình thức truy cập của truyện
export default function AccessBadge({ accessType, price, freeChapterCount }: Props) {
  if (accessType === "Free") {
    return <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Miễn phí</span>;
  }

  const detail =
    accessType === "Mixed"
      ? `${freeChapterCount ? `${freeChapterCount} chương đầu miễn phí` : "Một số chương miễn phí"}${price ? ` · ${formatPrice(price)}` : ""}`
      : price
        ? formatPrice(price)
        : "";

  return (
    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
      {accessType === "Paid" ? "Trả phí" : "Kết hợp"}
      {detail && ` · ${detail}`}
    </span>
  );
}
