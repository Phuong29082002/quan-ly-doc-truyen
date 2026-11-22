/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";

// components/GoogleLoginButton.tsx
declare global {
  interface Window {
    google: any;
  }
}

export function GoogleLoginButton({ onSuccess }: { onSuccess: (token: string) => void }) {
  useEffect(() => {
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (res: any) => onSuccess(res.credential),
    });
    window.google?.accounts.id.renderButton(
      document.getElementById("google-btn")!,
      { theme: "outline", size: "large", width: 320 }
    );
  }, []);

  return <div id="google-btn"></div>;
}