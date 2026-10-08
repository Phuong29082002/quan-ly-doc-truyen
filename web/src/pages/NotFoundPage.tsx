import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="mb-4">Không tìm thấy trang</p>
      <Link to="/" className="text-blue-600 underline">Về trang chủ</Link>
    </div>
  );
}