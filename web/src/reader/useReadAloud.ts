import { useEffect, useRef, useState } from "react";
import { parseChapterContent } from "../utils/chapterContent";

// PB48: nghe đọc truyện bằng giọng đọc có sẵn của trình duyệt (Web Speech API, giọng tiếng Việt nếu máy có)
export function useReadAloud(content: string, rate: number) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);

  // Dừng đọc khi đổi chương hoặc rời trang
  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (supported) window.speechSynthesis.cancel();
    };
  }, [content, supported]);

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ?? null;
  }

  function speakFrom(index: number) {
    const blocks = parseChapterContent(content);
    let i = index;
    while (i < blocks.length && blocks[i].type !== "text") i++;
    if (i >= blocks.length || stopRef.current) {
      setPlaying(false);
      setActive(null);
      return;
    }
    const block = blocks[i];
    const u = new SpeechSynthesisUtterance(block.type === "text" ? block.text : "");
    u.lang = "vi-VN";
    u.rate = rate;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onend = () => !stopRef.current && speakFrom(i + 1);
    u.onerror = () => {
      setPlaying(false);
      setActive(null);
    };
    setActive(i);
    document.querySelector(`[data-block="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.speechSynthesis.speak(u);
  }

  function play() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    stopRef.current = false;
    setPlaying(true);
    speakFrom(active ?? 0);
  }

  function pause() {
    stopRef.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  function stop() {
    pause();
    setActive(null);
  }

  return { supported, playing, active, play, pause, stop };
}
