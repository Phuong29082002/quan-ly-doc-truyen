import { assetUrl } from "../api/client";

interface Props {
  src: string | null | undefined;
  title: string;
  className?: string;
}

// Ảnh bìa; chưa có ảnh thì hiện khung màu kèm tên truyện
export default function CoverImage({ src, title, className = "" }: Props) {
  const url = assetUrl(src);
  if (url) return <img src={url} alt={title} className={`object-cover ${className}`} />;

  return (
    <div
      className={`flex items-center justify-center bg-linear-to-br from-blue-500 to-indigo-700 p-3 text-center text-sm font-semibold text-white ${className}`}
    >
      {title}
    </div>
  );
}
