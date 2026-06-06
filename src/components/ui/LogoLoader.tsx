"use client";

import React from "react";

interface LogoLoaderProps {
  text?: string;
  minHeight?: string;
}

export default function LogoLoader({ text = "Loading...", minHeight = "70vh" }: LogoLoaderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center w-full gap-5 transition-all duration-300"
      style={{ minHeight }}
    >
      <div className="spinner" />

      {text && (
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest animate-pulse">
          {text}
        </p>
      )}

      <style>{`
        .spinner {
          --d: 24.6px;
          width: 4.5px;
          height: 4.5px;
          border-radius: 50%;
          color: #474bff;
          box-shadow:
            calc(1*var(--d))      calc(0*var(--d))     0 0,
            calc(0.707*var(--d))  calc(0.707*var(--d)) 0 1.1px,
            calc(0*var(--d))      calc(1*var(--d))     0 2.2px,
            calc(-0.707*var(--d)) calc(0.707*var(--d)) 0 3.4px,
            calc(-1*var(--d))     calc(0*var(--d))     0 4.5px,
            calc(-0.707*var(--d)) calc(-0.707*var(--d))0 5.6px,
            calc(0*var(--d))      calc(-1*var(--d))    0 6.7px;
          animation: spinner-a90wxe 1s infinite steps(8);
        }

        @keyframes spinner-a90wxe {
          100% {
            transform: rotate(1turn);
          }
        }
      `}</style>
    </div>
  );
}
