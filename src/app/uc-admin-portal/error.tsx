"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, LayoutDashboard, Terminal } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console / logger
    console.error("Admin dashboard runtime error captured:", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="max-w-xl w-full text-center bg-white border border-zinc-200/80 p-8 md:p-12 rounded-3xl shadow-xl">
        
        {/* Error icon badge */}
        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
          Admin Console Error
        </h1>
        
        <p className="mt-3 text-sm text-zinc-500 font-medium leading-relaxed">
          An error occurred inside the administration workspace. System integrity remains intact.
        </p>

        {/* Technical stack trace / details log */}
        <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-left font-mono">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-2 mb-2 text-zinc-400">
            <Terminal className="h-4.5 w-4.5 text-orange-500" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Error Logs / Diagnostics</span>
          </div>
          
          <div className="space-y-1.5 overflow-x-auto max-h-40 text-xs custom-scrollbar">
            <p className="text-zinc-100 font-semibold break-words">
              {error.message || "An unknown exception occurred inside the Admin workspace."}
            </p>
            {error.digest && (
              <p className="text-zinc-500 text-[10px]">Digest: {error.digest}</p>
            )}
            <p className="text-zinc-500 text-[9px]">Timestamp: {new Date().toISOString()}</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all duration-250 active:scale-95 cursor-pointer shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Workspace
          </button>
          
          <Link prefetch={false}
            href="/uc-admin-portal"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-zinc-250 text-zinc-700 hover:bg-zinc-50 rounded-xl font-bold text-sm transition-all duration-250 active:scale-95 cursor-pointer shadow-sm"
          >
            <LayoutDashboard className="h-4 w-4 text-zinc-500" />
            Console Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
