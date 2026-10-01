import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function HomePage() {
  const [status, setStatus] = useState("Đang kiểm tra kết nối API...");

  useEffect(() => {
    api.get("/api/health")
      .then((res) => setStatus(`API hoạt động (${res.data.status})`))
      .catch(() => setStatus("Không kết nối được API"));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Trang chủ</h1>
      <p className="text-sm text-gray-500 mb-6">{status}</p>
      <p>Danh sách truyện mới cập nhật, mới phát hành, đọc nhiều sẽ hiển thị ở đây.</p>
    </div>
  );
}