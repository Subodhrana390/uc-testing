"use client";

import React from "react";

interface LogoLoaderProps {
  text?: string;
  minHeight?: string;
}

export default function LogoLoader({ text = "Loading details...", minHeight = "70vh" }: LogoLoaderProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center w-full gap-4 transition-all duration-300"
      style={{ minHeight }}
    >
      {/* Simple spinner */}
      <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#06b6d4] rounded-full animate-spin" />
      
      {text && (
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest animate-pulse mt-2">
          {text}
        </p>
      )}
    </div>
  );
}
