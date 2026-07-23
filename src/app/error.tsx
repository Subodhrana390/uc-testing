"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an analytics or error tracking service
    console.error("Unhandled runtime error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-zinc-100 to-zinc-200/50 px-4">
      <div className="max-w-md w-full text-center bg-white/80 backdrop-blur-md border border-zinc-250 p-8 rounded-3xl shadow-2xl transition-all hover:shadow-primary/5">
        
        {/* Error icon badge */}
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
          <AlertCircle className="h-8 w-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
          Something went wrong
        </h1>
        
        <p className="mt-3 text-sm text-zinc-500 font-medium leading-relaxed">
          An unexpected error occurred while loading this page. Our technical team has been notified.
        </p>

        {/* Technical details accordion (collapsible / unobtrusive) */}
        {error.message && (
          <div className="mt-4 p-3 bg-zinc-50 border border-zinc-150 rounded-xl text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Error Details</span>
            <p className="text-xs font-mono text-zinc-600 break-all mt-1">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-zinc-400 font-medium mt-1">Digest: {error.digest}</p>
            )}
          </div>
        )}

        {/* Buttons / Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 cursor-pointer shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          
          <Link prefetch={false}
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
          >
            <Home className="h-4 w-4 text-zinc-500" />
            Go Home
          </Link>
        </div>

        {/* Back Link */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 text-xs text-zinc-450 hover:text-zinc-900 inline-flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go back to previous page
        </button>
      </div>
    </div>
  );
}
