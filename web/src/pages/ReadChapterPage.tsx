import { useEffect, useState } from "react";
import { meApi } from "../api/payments";
import PayButton from "../components/PayButton";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import axios from "axios";
import { storyApi } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { ChapterContent } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { formatNumber } from "../utils/format";
import ChapterContentView from "../components/ChapterContentView";

const SETTINGS_KEY = "qldt_reader";

// PB22: thông tin kèm lỗi 403 khi chương trả phí chưa có quyền đọc
interface LockInfo {
  code: "LoginRequired" | "PurchaseRequired";
  storyTitle?: string;
  price?: number;
}

interface ReaderSettings {
  fontSize: number;
  dark: boolean;
}

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { fontSize: 18, dark: false, ...JSON.parse(raw) };
  } catch {
    // bỏ qua, dùng mặc định
  }
  return { fontSize: 18, dark: false };
}

// PB14: đọc chương, chuyển chương trước/sau, chỉnh cỡ chữ, chế độ tối
export default function ReadChapterPage() {
  const params = useParams();
  const storyId = Number(params.id);
  const number = Number(params.number);
  const key = `${storyId}/${number}`;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [state, setState] = useState<{ key: string; data?: ChapterContent; error?: string; lock?: LockInfo }>();
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

  useEffect(() => {
    let ignore = false;
    storyApi
      .readChapter(storyId, number)
      .then((data) => {
        if (ignore) return;
        setState({ key, data });
        window.scrollTo({ top: 0 });
      })
      .catch((err) => {
        if (ignore) return;
        let lock: LockInfo | undefined;
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          const d = err.response.data as Partial<LockInfo> | undefined;
          if (d?.code === "LoginRequired" || d?.code === "PurchaseRequired") lock = d as LockInfo;
        }
        setState({ key, error: getErrorMessage(err, "Không tải được chương"), lock });
      });
    return () => {
      ignore = true;
    };
  }, [key, storyId, number]);

  // PB26: mở lại đúng vị trí đọc lần trước và tự lưu vị trí khi cuộn (đồng bộ với Mobile)
  const loaded = state?.key === key && !!state.data;
  useEffect(() => {
    if (!user || !loaded) return;
    let stopped = false;
    let timer: number | undefined;
    let lastSaved = -1;

    const fraction = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    const save = () => {
      const pos = Math.round(fraction() * 1000) / 1000;
      if (Math.abs(pos - lastSaved) < 0.01) return;
      lastSaved = pos;
      meApi.saveProgress(storyId, number, pos).catch(() => {});
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 1000);
    };

    meApi
      .progress(storyId)
      .then((p) => {
        if (stopped || !p || p.chapterNumber !== number || p.position < 0.02) return;
        lastSaved = p.position;
        // Chờ ảnh minh họa hiển thị rồi mới cuộn tới vị trí cũ
        window.setTimeout(() => {
          if (stopped) return;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: p.position * max, behavior: "smooth" });
        }, 400);
      })
      .catch(() => {});

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stopped = true;
      window.removeEventListener("scroll", onScroll);
      // Không lưu thêm khi rời trang: lúc chuyển chương, API tự ghi nhận chương mới từ đầu
      window.clearTimeout(timer);
    };
  }, [user, loaded, storyId, number]);

  function changeSettings(next: Partial<ReaderSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      // không lưu được cũng không sao
    }
  }

  if (state?.key !== key) return <p className="py-12 text-center text-gray-500">Đang tải chương...</p>;

  if (state.lock) {
    const lock = state.lock;
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 text-center">
        <h1 className="text-xl font-bold">Chương {number} là nội dung trả phí</h1>
        {lock.storyTitle && <p className="mt-1 text-sm text-gray-500">{lock.storyTitle}</p>}

        {lock.code === "LoginRequired" && !user ? (
          <>
            <p className="mt-4 text-gray-700">Vui lòng đăng nhập để đọc chương này.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/login" state={{ from: location.pathname }} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Đăng nhập</Link>
              <Link to="/register" className="rounded border px-5 py-2 text-sm hover:bg-gray-50">Đăng ký</Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-gray-700">Bạn cần có gói đọc còn hạn hoặc mua truyện để đọc chương này.</p>
            {lock.price ? <p className="mt-2 text-sm text-gray-600">Giá mua truyện: <b>{formatNumber(lock.price)}đ</b></p> : null}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {lock.price ? (
                <PayButton kind="story" targetId={storyId} itemName={lock.storyTitle ?? "Truyện"} amount={lock.price}
                  label={`Mua truyện · ${formatNumber(lock.price)}đ`} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700" />
              ) : null}
              <Link to="/goi-doc" className="rounded border px-5 py-2 text-sm font-medium hover:bg-gray-50">Xem các gói đọc</Link>
            </div>
          </>
        )}

        <div className="mt-6">
          <Link to={`/truyen/${storyId}`} className="text-sm text-blue-600 underline">Quay lại trang truyện</Link>
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{state.error}</p>
        <Link to={`/truyen/${storyId}`} className="text-blue-600 underline">Quay lại trang truyện</Link>
      </div>
    );
  }

  const c = state.data;
  const go = (n: number | null) => n !== null && navigate(`/truyen/${storyId}/chuong/${n}`);

  const nav = (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => go(c.prevNumber)} disabled={c.prevNumber === null}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">‹ Chương trước</button>
      <Link to={`/truyen/${storyId}`} className="rounded border px-4 py-2 text-sm">Mục lục</Link>
      <button onClick={() => go(c.nextNumber)} disabled={c.nextNumber === null}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">Chương sau ›</button>
    </div>
  );

  return (
    <div className={`mx-auto max-w-3xl rounded-lg border p-5 sm:p-8 ${settings.dark ? "bg-gray-900 text-gray-200 border-gray-700" : "bg-white"}`}>
      <div className="mb-4 text-center">
        <Link to={`/truyen/${storyId}`} className="text-lg font-semibold hover:underline">{c.storyTitle}</Link>
        <h1 className="mt-1 text-xl font-bold">Chương {c.number}: {c.title}</h1>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2 text-sm">
        <span className="opacity-70">Cỡ chữ</span>
        <button className="rounded border px-2 py-0.5" onClick={() => changeSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}>A-</button>
        <span className="w-8 text-center">{settings.fontSize}</span>
        <button className="rounded border px-2 py-0.5" onClick={() => changeSettings({ fontSize: Math.min(30, settings.fontSize + 2) })}>A+</button>
        <button className="ml-3 rounded border px-3 py-0.5" onClick={() => changeSettings({ dark: !settings.dark })}>
          {settings.dark ? "Nền sáng" : "Nền tối"}
        </button>
      </div>

      {nav}

      <div className="my-8">
        <ChapterContentView content={c.content} fontSize={settings.fontSize} dark={settings.dark} />
      </div>

      {nav}
    </div>
  );
}
