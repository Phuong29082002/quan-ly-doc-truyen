// Màu bìa tạm theo tên truyện (cùng tên luôn ra cùng màu)
const PLACEHOLDER = ["#2b3359", "#0f6259", "#5b3a6e", "#7a4b1e", "#304f6e", "#5e2f3b"];
export function colorOf(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PLACEHOLDER[h % PLACEHOLDER.length];
}
