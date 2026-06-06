"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?mode=forgot");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Redirecting to Forgot Password Page...</p>
      </div>
    </div>
  );
}
