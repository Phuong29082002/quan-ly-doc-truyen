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
import CommentsSection from "../reader/CommentsSection";
import { useReadAloud } from "../reader/useReadAloud";

const SETTINGS_KEY = "qldt_reader";

// PB22: thông tin kèm lỗi 403 khi chương trả phí chưa có quyền đọc
interface LockInfo {
  code: "LoginRequired" | "PurchaseRequired";
  storyTitle?: string;
  price?: number;
}

type ReaderTheme = "light" | "sepia" | "dark";

// PB48: tùy chỉnh trình đọc (giao diện nền, phông chữ, cỡ chữ, giãn dòng, tốc độ đọc to)
interface ReaderSettings {
  fontSize: number;
  theme: ReaderTheme;
  serif: boolean;
  lineHeight: number;
  rate: number;
}

const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 19, theme: "light", serif: true, lineHeight: 1.9, rate: 1 };

const THEMES: Record<ReaderTheme, { label: string; panel: string; swatch: string }> = {
  light: { label: "Sáng", panel: "bg-white text-gray-900", swatch: "bg-white" },
  sepia: { label: "Giấy cũ", panel: "bg-[#f6efe0] text-[#3b2f1e] border-[#e6dac0]", swatch: "bg-[#f6efe0]" },
  dark: { label: "Tối", panel: "bg-gray-900 text-gray-200 border-gray-700", swatch: "bg-gray-900" },
};

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ReaderSettings> & { dark?: boolean };
      return { ...DEFAULT_SETTINGS, ...(saved.dark ? { theme: "dark" as const } : {}), ...saved };
    }
  } catch {
    // bỏ qua, dùng mặc định
  }
  return DEFAULT_SETTINGS;
}

// PB14, PB48: đọc chương, chuyển chương, tùy chỉnh trình đọc, nghe đọc; PB30: bình luận
export default function ReadChapterPage() {
  const params = useParams();
  const storyId = Number(params.id);
  const number = Number(params.number);
  const key = `${storyId}/${number}`;
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
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center">
        <h1 className="font-story text-2xl font-semibold">Chương {number} là nội dung trả phí</h1>
        {lock.storyTitle && <p className="mt-1 text-sm text-gray-500">{lock.storyTitle}</p>}

        {lock.code === "LoginRequired" && !user ? (
          <>
            <p className="mt-4 text-gray-700">Vui lòng đăng nhập để đọc chương này.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/login" state={{ from: location.pathname }} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink-soft">Đăng nhập</Link>
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
                  label={`Mua truyện · ${formatNumber(lock.price)}đ`} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink-soft" />
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

  return <Reader chapter={state.data} storyId={storyId} settings={settings} onSettings={changeSettings} />;
}

function Reader({ chapter: c, storyId, settings, onSettings }: {
  chapter: ChapterContent; storyId: number; settings: ReaderSettings; onSettings: (s: Partial<ReaderSettings>) => void;
}) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState(false);
  const tts = useReadAloud(c.content, settings.rate);
  const dark = settings.theme === "dark";
  const go = (n: number | null) => n !== null && navigate(`/truyen/${storyId}/chuong/${n}`);

  // Phím mũi tên trái/phải để chuyển chương
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowLeft" && c.prevNumber !== null) navigate(`/truyen/${storyId}/chuong/${c.prevNumber}`);
      if (e.key === "ArrowRight" && c.nextNumber !== null) navigate(`/truyen/${storyId}/chuong/${c.nextNumber}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.prevNumber, c.nextNumber, storyId, navigate]);

  const btn = `rounded-full border px-4 py-2 text-sm disabled:opacity-35 ${dark ? "border-gray-600 hover:bg-gray-800" : "border-current/20 hover:bg-black/5"}`;
  const nav = (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => go(c.prevNumber)} disabled={c.prevNumber === null} className={btn}>Chương trước</button>
      <Link to={`/truyen/${storyId}`} className={btn}>Mục lục</Link>
      <button onClick={() => go(c.nextNumber)} disabled={c.nextNumber === null} className={btn}>Chương sau</button>
    </div>
  );

  return (
    <div>
      <div className={`mx-auto max-w-3xl rounded-xl border px-5 py-8 sm:px-12 ${THEMES[settings.theme].panel}`}>
        <div className="mb-6 text-center">
          <Link to={`/truyen/${storyId}`} className="text-sm opacity-70 hover:underline">{c.storyTitle}</Link>
          <h1 className="mt-1 font-story text-2xl font-semibold">Chương {c.number}: {c.title}</h1>
        </div>

        {/* Thanh công cụ đọc */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          {tts.supported && (
            tts.playing ? (
              <button onClick={tts.pause} className="rounded-full bg-lamp px-4 py-1.5 font-medium text-ink">Tạm dừng nghe</button>
            ) : (
              <button onClick={tts.play} className="rounded-full bg-lamp px-4 py-1.5 font-medium text-ink">{tts.active !== null ? "Nghe tiếp" : "Nghe đọc"}</button>
            )
          )}
          {tts.active !== null && <button onClick={tts.stop} className={btn.replace("px-4 py-2", "px-3 py-1.5")}>Dừng</button>}
          <button onClick={() => setPanel((p) => !p)} aria-expanded={panel} className={btn.replace("px-4 py-2", "px-4 py-1.5")}>Tùy chỉnh</button>
        </div>

        {panel && (
          <div className={`mb-6 grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2 ${dark ? "border-gray-700" : "border-current/15"}`}>
            <div>
              <p className="mb-1.5 opacity-70">Màu nền</p>
              <div className="flex gap-2">
                {(Object.keys(THEMES) as ReaderTheme[]).map((t) => (
                  <button key={t} onClick={() => onSettings({ theme: t })} aria-pressed={settings.theme === t}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${settings.theme === t ? "border-lamp ring-1 ring-lamp" : "border-current/20"}`}>
                    <span className={`h-3.5 w-3.5 rounded-full border border-gray-400 ${THEMES[t].swatch}`} />{THEMES[t].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 opacity-70">Phông chữ</p>
              <div className="flex gap-2">
                <button onClick={() => onSettings({ serif: true })} aria-pressed={settings.serif} className={`rounded-full border px-3 py-1 font-story ${settings.serif ? "border-lamp ring-1 ring-lamp" : "border-current/20"}`}>Có chân</button>
                <button onClick={() => onSettings({ serif: false })} aria-pressed={!settings.serif} className={`rounded-full border px-3 py-1 font-sans ${!settings.serif ? "border-lamp ring-1 ring-lamp" : "border-current/20"}`}>Không chân</button>
              </div>
            </div>
            <Stepper label="Cỡ chữ" value={settings.fontSize} display={`${settings.fontSize}`} onChange={(v) => onSettings({ fontSize: v })} min={14} max={30} step={1} />
            <Stepper label="Giãn dòng" value={settings.lineHeight} display={settings.lineHeight.toFixed(1)} onChange={(v) => onSettings({ lineHeight: Math.round(v * 10) / 10 })} min={1.4} max={2.6} step={0.1} />
            {tts.supported && (
              <Stepper label="Tốc độ nghe đọc" value={settings.rate} display={`${settings.rate.toFixed(1)}x`} onChange={(v) => onSettings({ rate: Math.round(v * 10) / 10 })} min={0.6} max={2} step={0.1} />
            )}
          </div>
        )}

        {nav}

        <div className="my-10">
          <ChapterContentView content={c.content} fontSize={settings.fontSize} dark={dark} lineHeight={settings.lineHeight} serif={settings.serif} activeBlock={tts.active} />
        </div>

        {nav}
        <p className="mt-4 text-center text-xs opacity-50">Mẹo: dùng phím mũi tên trái, phải để chuyển chương</p>
      </div>

      <CommentsSection chapterId={c.id} dark={dark} />
    </div>
  );
}

function Stepper({ label, value, display, onChange, min, max, step }: {
  label: string; value: number; display: string; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div>
      <p className="mb-1.5 opacity-70">{label}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Giảm ${label.toLowerCase()}`} className="h-8 w-8 rounded-full border border-current/20 disabled:opacity-30">−</button>
        <span className="w-12 text-center tabular-nums">{display}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`Tăng ${label.toLowerCase()}`} className="h-8 w-8 rounded-full border border-current/20 disabled:opacity-30">+</button>
      </div>
    </div>
  );
}
