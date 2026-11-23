/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";

// components/GoogleLoginButton.tsx
export function GoogleLoginButton({ onSuccess }: { onSuccess: (token: string) => void }) {
  useEffect(() => {
    (window as any).google?.accounts?.id?.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (res: any) => onSuccess(res.credential),
    });
    const btn = document.getElementById("google-btn");
    if (btn) {
      (window as any).google?.accounts?.id?.renderButton(
        btn,
        { theme: "outline", size: "large", width: 320 }
      );
    }
  }, [onSuccess]);

  return <div id="google-btn"></div>;
}
