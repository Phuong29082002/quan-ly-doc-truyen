import type { ReactNode } from "react";

const styles = {
  error: "bg-red-50 border-red-200 text-red-700",
  success: "bg-green-50 border-green-200 text-green-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

export default function Alert({ type = "error", children }: { type?: keyof typeof styles; children: ReactNode }) {
  return <div className={`mb-4 rounded border px-3 py-2 text-sm ${styles[type]}`}>{children}</div>;
}
