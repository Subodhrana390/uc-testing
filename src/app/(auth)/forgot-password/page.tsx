"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { createClient } from "@/utils/supabase/client";
import { requestPasswordReset } from "@/app/actions/auth";

function ForgotPasswordContainer() {
  const [loading, setLoading] = useState(false);

  async function handleForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const result = await requestPasswordReset(formData, window.location.origin);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Recovery link sent! Check your inbox.");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row min-h-[600px] border border-zinc-200">
      {/* Visual Side Panel */}
      <div className="relative w-full md:w-5/12 bg-zinc-50 text-zinc-900 p-10 md:p-12 flex flex-col justify-between overflow-hidden border-r border-zinc-200">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full -mr-64 -mt-64 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/[0.04] rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="UC Enterprises Logo" width={40} height={40} className="object-cover" />
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-zinc-800">
              UC Enterprises
            </span>
          </div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-4 pt-8">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 leading-tight">
              Reset access.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-medium">
              Enter your email and we'll send you secure instructions to reset your password.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-zinc-650">
              <CheckCircle2 className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold">Fast, reliable fulfillment</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-650">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold">Secure, encrypted checkout</span>
            </div>
          </div>
          <Link prefetch={false} href="/login">
            <button className="w-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 font-bold rounded-xl h-12 transition-all duration-200 active:scale-95 shadow-sm">
              Return to Sign In
            </button>
          </Link>
        </div>
      </div>

      {/* Forms Container */}
      <div className="flex-1 p-8 md:p-16 bg-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Recover Password</h1>
            <p className="text-sm text-zinc-500">We'll send you reset instructions</p>
          </div>

          <form onSubmit={handleForgot} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input name="email" type="email" placeholder="name@company.com" required className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Send Instructions <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="text-center">
              <Link prefetch={false} href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: { user: u } }] = await Promise.all([
        supabase.from("categories").select("id, name, slug, parent_id").eq("status", true).order("name"),
        (supabase.auth as any).getUser()
      ]);
      setCategories(cats || []);
      setUser(u);
    }
    fetchData();
  }, [supabase]);

  return (
    <div className="w-full min-h-screen flex flex-col bg-zinc-50">
      <Header categories={categories} user={user} />
      <main className="w-full flex-1 flex items-center justify-center py-12 md:py-20 px-4 sm:px-6">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <p className="text-sm font-medium text-zinc-500">Loading secure environment...</p>
          </div>
        }>
          <ForgotPasswordContainer />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
