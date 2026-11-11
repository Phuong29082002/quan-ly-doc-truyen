import { useEffect, useState } from "react";
import { packageApi, type PackageItem } from "../api/packages";
import { getErrorMessage } from "../api/client";
import { formatPrice } from "../utils/format";

// PB18: người đọc xem các gói đang bán (đăng ký + thanh toán ở Sprint 3)
export default function PricingPage() {
  const [state, setState] = useState<{ data?: PackageItem[]; error?: string }>();

  useEffect(() => {
    let ignore = false;
    packageApi
      .listActive()
      .then((data) => !ignore && setState({ data }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Gói đọc</h1>
      <p className="mb-6 text-sm text-gray-600">Đăng ký gói để đọc các chương trả phí trong thời hạn của gói.</p>

      {!state && <p className="text-gray-500">Đang tải...</p>}
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.data?.length === 0 && <p className="text-gray-500">Hiện chưa có gói đọc nào.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state?.data?.map((p) => (
          <div key={p.id} className="flex flex-col rounded-lg border bg-white p-5">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-2 text-3xl font-bold text-blue-600">{formatPrice(p.price)}</p>
            <p className="text-sm text-gray-500">cho {p.durationDays} ngày</p>
            <p className="mt-4 flex-1 text-sm text-gray-700">
              {p.scope === "All"
                ? "Đọc tất cả truyện trả phí trên hệ thống."
                : `Đọc các truyện: ${p.stories.map((s) => s.title).join(", ")}.`}
            </p>
            <button
              disabled
              title="Thanh toán sẽ có ở Sprint 3"
              className="mt-5 rounded bg-blue-600 py-2 text-sm font-medium text-white opacity-50"
            >
              Đăng ký (sắp ra mắt)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
