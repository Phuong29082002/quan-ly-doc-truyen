import { useParams } from "react-router";

export default function ReadChapterPage() {
  const { id, number } = useParams();
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Truyện #{id} - Chương {number}</h1>
      <p>Nội dung chương sẽ hiển thị ở đây.</p>
    </div>
  );
}