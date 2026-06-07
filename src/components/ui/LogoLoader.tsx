"use client";

import React from "react";

interface LogoLoaderProps {
  text?: string;
  minHeight?: string;
}

export default function LogoLoader({ minHeight = "70vh" }: LogoLoaderProps) {
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ minHeight }}
    >
      <div className="spinner" />

      <style>{`
        .spinner {
          --d: 16.4px;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          color: #ef4444; /* red-500 */
          box-shadow:
            calc(1*var(--d))      calc(0*var(--d))     0 0,
            calc(0.707*var(--d))  calc(0.707*var(--d)) 0 0.7px,
            calc(0*var(--d))      calc(1*var(--d))     0 1.4px,
            calc(-0.707*var(--d)) calc(0.707*var(--d)) 0 2.2px,
            calc(-1*var(--d))     calc(0*var(--d))     0 3px,
            calc(-0.707*var(--d)) calc(-0.707*var(--d))0 3.7px,
            calc(0*var(--d))      calc(-1*var(--d))    0 4.4px;
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
