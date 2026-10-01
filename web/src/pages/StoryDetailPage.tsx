import { Link, useParams } from "react-router";

export default function StoryDetailPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Chi tiết truyện #{id}</h1>
      <Link to={`/truyen/${id}/chuong/1`} className="text-blue-600 underline">Đọc chương 1</Link>
    </div>
  );
}