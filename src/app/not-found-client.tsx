"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";

export default function NotFoundClient() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
        }
        return prev - 1;
      });
    }, 1000);

    const redirectTimeout = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12 sm:py-20">

      {/* Card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-10 text-center">

        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>

        {/* Title */}
        <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-zinc-900">
          404
        </h1>

        <p className="mt-3 text-sm sm:text-base font-medium text-zinc-500">
          The page you are looking for doesn’t exist.
        </p>

        <p className="mt-4 text-xs font-semibold text-primary/80 uppercase tracking-widest animate-pulse">
          Redirecting to home page in {countdown}s...
        </p>
      </div>
    </div>
  );
}