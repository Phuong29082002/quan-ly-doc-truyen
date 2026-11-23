import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { coinsApi } from "../api/coins";
import type { CoinBalance, CoinPackage, CoinTransaction, DailyMission } from "../api/types";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";

export default function CoinsMissionPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [history, setHistory] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal nạp xu
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [provider, setProvider] = useState<"Mock" | "VNPay">("Mock");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [b, m, pkgs, h] = await Promise.all([
        coinsApi.getBalance(),
        coinsApi.getMissions(),
        coinsApi.getPackages(),
        coinsApi.getHistory(1, 15),
      ]);
      setBalance(b);
      setMissions(m);
      setPackages(pkgs);
      setHistory(h.items);
      if (user && b.coins !== user.coins) {
        updateUser({ ...user, coins: b.coins });
      }
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Không thể tải dữ liệu xu") });
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!balance || balance.hasCheckedInToday || submittingCheckIn) return;
    setSubmittingCheckIn(true);
    setMessage(null);
    try {
      const res = await coinsApi.checkIn();
      setMessage({ type: "success", text: res.message });
      setBalance((prev) =>
        prev
          ? {
              ...prev,
              coins: res.newBalance,
              hasCheckedInToday: true,
              consecutiveDays: res.consecutiveDays,
              lastCheckInAt: new Date().toISOString(),
            }
          : null,
      );
      if (user) updateUser({ ...user, coins: res.newBalance });
      // Tải lại lịch sử
      const h = await coinsApi.getHistory(1, 15);
      setHistory(h.items);
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Điểm danh thất bại") });
    } finally {
      setSubmittingCheckIn(false);
    }
  }

  async function handleClaim(key: string) {
    if (claimingKey) return;
    setClaimingKey(key);
    setMessage(null);
    try {
      const res = await coinsApi.claimMission(key);
      setMessage({ type: "success", text: res.message });
      setBalance((prev) => (prev ? { ...prev, coins: res.newBalance } : null));
      if (user) updateUser({ ...user, coins: res.newBalance });
      setMissions((prev) =>
        prev.map((m) => (m.key === key ? { ...m, isClaimed: true } : m)),
      );
      const h = await coinsApi.getHistory(1, 15);
      setHistory(h.items);
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Nhận thưởng thất bại") });
    } finally {
      setClaimingKey(null);
    }
  }

  async function handleTopUp() {
    if (!selectedPkg || paying) return;
    setPaying(true);
    try {
      const res = await coinsApi.startTopUp(selectedPkg.id, provider);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else if (res.provider === "Mock") {
        navigate(`/thanh-toan/mock?t=${res.transactionId}`);
      }
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Không thể tạo đơn nạp xu") });
      setSelectedPkg(null);
    } finally {
      setPaying(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
          🪙
        </div>
        <h1 className="text-2xl font-bold">Hệ thống Xu & Điểm Danh</h1>
        <p className="mt-2 text-gray-600">Đăng nhập để điểm danh nhận xu, hoàn thành nhiệm vụ và mở khóa chương truyện yêu thích.</p>
        <Link
          to="/login"
          state={{ from: "/nhiem-vu" }}
          className="mt-6 inline-block rounded-full bg-ink px-6 py-2.5 font-medium text-white hover:bg-ink-soft"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const currentStreak = balance?.consecutiveDays ?? 0;
  // Chu kỳ 7 ngày điểm danh
  const daysOfWeek = [
    { day: 1, reward: 10 },
    { day: 2, reward: 10 },
    { day: 3, reward: 10 },
    { day: 4, reward: 10 },
    { day: 5, reward: 10 },
    { day: 6, reward: 10 },
    { day: 7, reward: 30 },
  ];

  const activeDayInCycle = balance?.hasCheckedInToday
    ? ((currentStreak - 1) % 7) + 1
    : (currentStreak % 7) + 1;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Thông báo */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Hero: Thẻ số dư ví xu & Nút điểm danh */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-lg md:p-8">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              ✨ Ví xu đọc truyện
            </span>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                {balance ? balance.coins.toLocaleString() : "..."}
              </span>
              <span className="text-xl font-medium text-amber-200">xu</span>
            </div>
            <p className="mt-2 text-sm text-amber-100/90">
              Chuỗi điểm danh liên tục: <b className="text-white">{currentStreak} ngày</b>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <button
              onClick={handleCheckIn}
              disabled={loading || balance?.hasCheckedInToday || submittingCheckIn}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-md transition ${
                balance?.hasCheckedInToday
                  ? "bg-white/20 text-white/90 cursor-not-allowed backdrop-blur-sm"
                  : "bg-white text-amber-900 hover:bg-amber-50 active:scale-95"
              }`}
            >
              {balance?.hasCheckedInToday ? (
                <>
                  <svg className="h-5 w-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Đã điểm danh hôm nay
                </>
              ) : (
                <>
                  <span>🎁</span>
                  <span>Điểm danh ngay (+{balance?.nextCheckInReward ?? 10} xu)</span>
                </>
              )}
            </button>
            <p className="text-xs text-amber-200/80">
              {balance?.hasCheckedInToday ? "Quay lại vào ngày mai để tiếp tục chuỗi nhận thưởng!" : "Điểm danh mỗi ngày để duy trì chuỗi thưởng lớn"}
            </p>
          </div>
        </div>

        {/* Trang trí nền */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 right-40 h-40 w-40 rounded-full bg-amber-300/20 blur-xl" />
      </div>

      {/* Khối Điểm Danh 7 Ngày Liên Tục */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Chuỗi quà điểm danh 7 ngày</h2>
          <span className="text-xs text-gray-500">Chu kỳ thưởng hàng tuần</span>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {daysOfWeek.map((item) => {
            const isCompleted = balance?.hasCheckedInToday
              ? item.day <= activeDayInCycle
              : item.day < activeDayInCycle;
            const isToday = item.day === activeDayInCycle && !balance?.hasCheckedInToday;

            return (
              <div
                key={item.day}
                className={`flex flex-col items-center justify-between rounded-xl border p-2 text-center transition sm:p-3 ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                    : isToday
                    ? "border-amber-400 bg-amber-50/80 shadow-sm ring-2 ring-amber-300 ring-offset-1"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                <span className="text-xs font-medium">Ngày {item.day}</span>
                <div className="my-1.5 text-2xl sm:text-3xl">
                  {item.day === 7 ? "🏆" : isCompleted ? "✅" : "🪙"}
                </div>
                <span className="text-xs font-bold text-amber-700">+{item.reward}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Khối Nhiệm Vụ Hằng Ngày */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nhiệm vụ đọc hôm nay</h2>
            <p className="text-xs text-gray-500">Hoàn thành các mốc đọc để tích lũy thêm xu mở khóa chương</p>
          </div>
          <button
            onClick={loadAll}
            className="text-xs text-amber-700 hover:text-amber-800 hover:underline"
          >
            Làm mới
          </button>
        </div>

        <div className="space-y-4">
          {missions.map((m) => {
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));
            return (
              <div
                key={m.key}
                className="flex flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{m.title}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      +{m.rewardCoins} xu
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{m.description}</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {m.current}/{m.target}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end sm:w-36">
                  {m.isClaimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
                      <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Đã nhận
                    </span>
                  ) : m.isCompleted ? (
                    <button
                      onClick={() => handleClaim(m.key)}
                      disabled={claimingKey === m.key}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 active:scale-95 transition"
                    >
                      {claimingKey === m.key ? "Đang nhận..." : "Nhận thưởng"}
                    </button>
                  ) : (
                    <Link
                      to="/"
                      className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Đọc ngay
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Khối Gói Nạp Xu */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nạp xu ưu đãi</h2>
          <p className="text-xs text-gray-500">Mở khóa vĩnh viễn từng chương truyện trả phí chỉ với 5 xu/chương</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md"
            >
              {pkg.tag && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {pkg.tag}
                </span>
              )}
              <div>
                <h3 className="font-semibold text-gray-800">{pkg.name}</h3>
                <div className="my-3 flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-extrabold text-amber-600">{pkg.coins + pkg.bonusCoins}</span>
                  <span className="text-xs font-medium text-gray-500">xu</span>
                </div>
                {pkg.bonusCoins > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">Tặng thêm {pkg.bonusCoins} xu!</p>
                )}
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setSelectedPkg(pkg)}
                  className="w-full rounded-lg bg-ink py-2 text-sm font-semibold text-white transition hover:bg-ink-soft active:scale-95"
                >
                  {pkg.price.toLocaleString()}đ
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Khối Lịch Sử Giao Dịch Xu */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Lịch sử biến động xu</h2>
        {history.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-6">Chưa có giao dịch xu nào.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{t.description}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("vi-VN")}</p>
                </div>
                <span
                  className={`font-bold ${
                    t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {t.amount > 0 ? `+${t.amount}` : t.amount} xu
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal xác nhận nạp xu */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Xác nhận nạp xu</h3>
            <div className="mt-4 rounded-xl bg-amber-50/70 p-4 text-center">
              <span className="text-sm text-gray-600">{selectedPkg.name}</span>
              <div className="my-1 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-extrabold text-amber-700">
                  {selectedPkg.coins + selectedPkg.bonusCoins}
                </span>
                <span className="text-sm font-semibold text-amber-900">xu</span>
              </div>
              <p className="text-sm font-bold text-gray-800">Số tiền: {selectedPkg.price.toLocaleString()}đ</p>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-700">Chọn cổng thanh toán:</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider("Mock")}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === "Mock"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-300"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">Cổng giả lập</span>
                  <span className="text-xs text-gray-500">Dành cho demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("VNPay")}
                  className={`rounded-xl border p-3 text-left transition ${
                    provider === "VNPay"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-300"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">VNPay</span>
                  <span className="text-xs text-gray-500">Sandbox</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedPkg(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleTopUp}
                disabled={paying}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 active:scale-95 transition"
              >
                {paying ? "Đang xử lý..." : "Thanh toán ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
