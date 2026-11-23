import { useEffect, useState } from "react";
import { packageApi, type PackageItem } from "../api/packages";
import { getErrorMessage } from "../api/client";
import { meApi, type MyPackage } from "../api/payments";
import { useAuth } from "../auth/useAuth";
import PayButton from "../components/PayButton";
import { formatDateTime, formatPrice } from "../utils/format";

// PB18: gói đang bán; PB19: đăng ký và thanh toán; PB20: gia hạn (cộng dồn thời gian)
export default function PricingPage() {
  const { user } = useAuth();
  const [state, setState] = useState<{ data?: PackageItem[]; error?: string }>();
  const [mine, setMine] = useState<{ userId: number; packages: MyPackage[]; loadedAt: number }>();

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

  // Gói đang dùng của tôi: để hiện nút "Gia hạn" và ngày hết hạn
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    meApi
      .library()
      .then((lib) => !ignore && setMine({ userId: user.id, packages: lib.packages, loadedAt: Date.now() }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user]);

  // Hạn xa nhất của từng gói (tính cả phần gia hạn chưa tới lượt)
  const myEnd = (packageId: number) => {
    if (!user || mine?.userId !== user.id) return null;
    const ends = mine.packages.filter((p) => p.packageId === packageId && !p.isPaused && new Date(p.endAt).getTime() > mine.loadedAt).map((p) => p.endAt);
    return ends.length ? ends.sort().at(-1)! : null;
  };

  // Gói khác đang dùng: mua gói mới sẽ tạm dừng gói đó và bảo lưu số ngày còn lại
  const switchNote = (packageId: number) => {
    if (!user || mine?.userId !== user.id) return undefined;
    const other = mine.packages.find((p) => p.isActive && p.packageId !== packageId);
    if (!other) return undefined;
    const days = Math.max(1, Math.ceil((new Date(other.endAt).getTime() - mine.loadedAt) / 86400000));
    return `Bạn đang dùng gói ${other.packageName}. Khi chuyển sang gói này, gói ${other.packageName} được tạm dừng và bảo lưu ${days} ngày, có thể khôi phục lại trong Tài khoản.`;
  };

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
            {myEnd(p.id) && (
              <p className="mt-3 rounded bg-green-50 px-2 py-1 text-xs text-green-700">Bạn đang dùng gói này, hạn đến {formatDateTime(myEnd(p.id)!)}</p>
            )}
            <PayButton
              kind="package"
              targetId={p.id}
              itemName={p.name}
              amount={p.price}
              label={myEnd(p.id) ? "Gia hạn thêm" : switchNote(p.id) ? "Chuyển sang gói này" : "Đăng ký ngay"}
              note={myEnd(p.id) ? undefined : switchNote(p.id)}
              className="mt-4 w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
