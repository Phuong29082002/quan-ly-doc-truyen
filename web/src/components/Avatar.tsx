import { assetUrl } from "../api/client";

// Ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên
export default function Avatar({ url, name, size = 32, className = "" }: { url?: string | null; name: string; size?: number; className?: string }) {
  const src = assetUrl(url);
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span style={{ ...style, fontSize: size * 0.42 }} className={`grid shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-800 ${className}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
