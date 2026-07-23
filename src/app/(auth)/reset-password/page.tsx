"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { createClient } from "@/utils/supabase/client";

function ResetPasswordContainer() {
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: formData.newPassword
    });

    if (error) {
      toast.error(error.message || "Failed to reset password. The link might be expired.");
    } else {
      toast.success("Password updated successfully!");
      // Log the user out so they can log in cleanly, or just redirect them.
      await supabase.auth.signOut();
      router.push("/login");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row min-h-[600px] border border-zinc-200">
      {/* Visual Side Panel */}
      <div className="relative w-full md:w-5/12 bg-zinc-50 text-zinc-900 p-10 md:p-12 flex flex-col justify-between overflow-hidden border-r border-zinc-200">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.04] rounded-full -mr-64 -mt-64 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/[0.04] rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="UC Enterprises" width={40} height={40} className="object-cover" />
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-zinc-800">
              UC Enterprises
            </span>
          </div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-4 pt-8">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 leading-tight">
              Set new password.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-medium">
              Please enter your new password below. Make sure it's strong and secure.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-zinc-650">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold">Fast, reliable fulfillment</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-650">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold">Secure, encrypted checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Container */}
      <div className="flex-1 p-8 md:p-16 bg-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Update Password</h1>
            <p className="text-sm text-zinc-500">Secure your account</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    name="newPassword"
                    type={showNew ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    required
                    className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Reset Password <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
          <ResetPasswordContainer />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
