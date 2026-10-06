import { useAuth } from "../auth/useAuth";

export default function AdminPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Trang quản trị</h1>
      <p className="text-gray-600">Xin chào {user?.displayName}. Quản lý thể loại, truyện, chương sẽ có ở đây.</p>
    </div>
  );
}
