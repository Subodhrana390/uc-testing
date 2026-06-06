"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  ArrowRight,
  Loader2,
  UserCheck,
} from "lucide-react";

import { login } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);

    const formData = new FormData(
      event.currentTarget
    );

    const result = await login(formData);

    if (result?.error) {
      toast.error(result.error);

      setLoading(false);
    } else if (result?.success) {
      toast.success(
        "Signed in successfully"
      );

      window.location.href =
        result.redirectTo || "/admin";
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center py-20 px-6 relative overflow-hidden">
      {/* Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Blur Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-6 rounded-[2rem] relative">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-lg group-hover:bg-indigo-500/10 transition-all" />

              <div className="relative flex items-center justify-center">
                <Image
                  src="/logo.jpg"
                  alt="UC Enterprises"
                  width={100}
                  height={100}
                  className="object-contain mix-blend-multiply"
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
                Admin{" "}
                <span className="text-indigo-600">
                  Portal
                </span>
              </h1>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 pt-2"
          >
            <input
              type="hidden"
              name="redirectTo"
              value="/admin"
            />

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400 ml-1">
                  Email
                </label>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>

                  <input
                    name="email"
                    type="email"
                    placeholder="operator@ucenterprises.com"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 px-10 py-3 text-[11px] font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400 ml-1">
                  Password
                </label>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                    <Lock className="h-3.5 w-3.5" />
                  </div>

                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 px-10 py-3 text-[11px] font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Simple Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gray-900 hover:bg-indigo-600 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-gray-200 transition-all rounded-xl flex items-center justify-center group disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in

                  <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-2 flex flex-col items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest transition-colors hover:text-indigo-600"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center space-y-1">
          <p className="text-[8px] text-gray-300 uppercase tracking-tighter">
            Authorized Use Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}