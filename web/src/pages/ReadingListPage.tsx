import { useEffect, useState } from "react";
import { Link } from "react-router";
import { paymentApi, type ReadingProgress } from "../api/payments";
import { getErrorMessage } from "../api/client";
import { formatDateTime } from "../utils/format";
export default function ReadingListPage() {
  const [items,setItems]=useState<ReadingProgress[]>(); const [error,setError]=useState("");
  useEffect(()=>{paymentApi.progress().then(setItems).catch(e=>setError(getErrorMessage(e)));},[]);
  return <div><h1 className="mb-5 text-2xl font-bold">Truyện đang đọc</h1>{error&&<p className="text-red-600">{error}</p>}{!items&&!error&&<p>Đang tải...</p>}{items?.length===0&&<p className="text-gray-500">Bạn chưa có lịch sử đọc truyện.</p>}<div className="space-y-3">{items?.map(x=><div key={x.storyId} className="flex items-center justify-between rounded-lg border bg-white p-4"><div><Link className="font-semibold text-blue-600 hover:underline" to={`/truyen/${x.storyId}`}>{x.storyTitle}</Link><p className="text-sm text-gray-600">Đang đọc chương {x.chapterNumber}: {x.chapterTitle}</p><p className="text-xs text-gray-400">Lần đọc gần nhất: {formatDateTime(x.updatedAt)}</p></div><Link className="rounded bg-blue-600 px-3 py-2 text-sm text-white" to={`/truyen/${x.storyId}/chuong/${x.chapterNumber}`}>Đọc tiếp</Link></div>)}</div></div>;
}
