"use client";

import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";

export default function NotFoundClient() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">

      {/* Background Glow */}
      <div className="absolute -top-40 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-pink-100 blur-3xl" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-2xl">

        {/* Icon */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-12 w-12 text-primary" />
        </div>

        {/* Title */}
        <h1 className="mt-8 text-7xl font-black tracking-tight text-zinc-900">
          404
        </h1>

        <p className="mt-3 text-lg font-medium text-zinc-500">
          The page you are looking for doesn’t exist.
        </p>

        {/* Manual Redirect Button */}
        <Link 
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors px-6 py-3 text-sm font-semibold text-white group"
        >
          Return to homepage
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}