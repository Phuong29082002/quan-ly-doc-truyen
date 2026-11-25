import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "../api/client";
import { chatbotApi } from "../api/discovery";
import type { StoryListItem } from "../api/types";
import CoverImage from "./CoverImage";

interface ChatMessage {
  from: "bot" | "me";
  text: string;
  stories?: StoryListItem[];
}

const FIRST_SUGGESTIONS = [
  "Truyện trinh thám hay nhất",
  "Truyện miễn phí đã hoàn thành",
  "Gợi ý truyện cho tôi",
  "Gói đọc giá bao nhiêu?",
];

const GREETING: ChatMessage = {
  from: "bot",
  text: "Chào bạn! Mình gợi ý truyện theo thể loại, tác giả, truyện miễn phí hay đã hoàn thành. Bạn muốn đọc gì?",
};

// PB61: khung chat gợi ý truyện, nổi ở góc dưới bên trái mọi trang độc giả
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [suggestions, setSuggestions] = useState<string[]>(FIRST_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Luôn cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setMessages((m) => [...m, { from: "me", text: message }]);
    setSending(true);
    try {
      const res = await chatbotApi.ask(message);
      setMessages((m) => [...m, { from: "bot", text: res.reply, stories: res.stories }]);
      if (res.suggestions.length) setSuggestions(res.suggestions);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: getErrorMessage(err, "Mình đang gặp lỗi, bạn thử lại sau nhé.") }]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-lamp px-4 py-3 text-sm font-semibold text-[#1a1406] shadow-2xl transition hover:brightness-110"
        aria-label="Mở trợ lý gợi ý truyện"
      >
        <span aria-hidden>💬</span> Hỏi gợi ý truyện
      </button>
    );
  }

  return (
    <section
      aria-label="Trợ lý gợi ý truyện"
      className="fixed bottom-5 left-5 z-40 flex h-[min(560px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151827] text-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-semibold">Trợ lý gợi ý truyện</p>
          <p className="text-xs text-white/60">Hỏi theo thể loại, tác giả, tên truyện</p>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Đóng">
          ✕
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "me" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                m.from === "me" ? "rounded-br-sm bg-lamp text-[#1a1406]" : "rounded-bl-sm bg-white/10"
              }`}
            >
              {m.text}
            </div>
            {m.stories && m.stories.length > 0 && (
              <ul className="mt-2 space-y-2">
                {m.stories.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/truyen/${s.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl bg-white/5 p-2 transition hover:bg-white/10"
                    >
                      <CoverImage src={s.coverUrl} title={s.title} small className="h-14 w-10 shrink-0 rounded" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{s.title}</span>
                        <span className="block truncate text-xs text-white/60">
                          {s.author} · {s.chapterCount} chương
                          {(s.ratingAverage ?? 0) > 0 ? ` · ★ ${(s.ratingAverage ?? 0).toFixed(1)}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {sending && <p className="text-sm text-white/60">Đang tìm truyện...</p>}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={sending}
            className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:border-lamp hover:text-white disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder="Ví dụ: truyện cổ tích miễn phí"
          className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lamp"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-lamp px-3 py-2 text-sm font-semibold text-[#1a1406] disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </section>
  );
}
