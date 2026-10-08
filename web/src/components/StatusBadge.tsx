import { STATUS_LABEL, type StoryStatus } from "../api/types";

export default function StatusBadge({ status }: { status: StoryStatus }) {
  const color = status === "Completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{STATUS_LABEL[status]}</span>;
}
