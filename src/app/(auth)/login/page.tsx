"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2, User, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { signup } from "@/app/actions/auth";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { createClient } from "@/utils/supabase/client";

function AuthContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMode = (searchParams.get("mode") as "login" | "register" | "forgot") || "login";
  const returnTo = searchParams.get("returnTo") || "/account/profile";

  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const changeMode = (newMode: "login" | "register" | "forgot") => {
    setMode(newMode);
    router.replace(`/login?mode=${newMode}&returnTo=${encodeURIComponent(returnTo)}`, { scroll: false });
  };

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Welcome back!");
      window.location.href = returnTo;
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (formData.get('password') !== formData.get('confirmPassword')) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    const result = await signup(formData);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else if (result?.success) {
      toast.success("Welcome! Check your email to verify your account.");
      changeMode("login");
      setLoading(false);
    }
  }

  async function handleForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const supabase = createClient();

    const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Recovery link sent! Check your inbox.");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row min-h-[600px] border border-zinc-200">

      {/* Visual Side Panel - "The Experience" */}
      <div className={`relative w-full md:w-5/12 bg-zinc-950 text-white p-10 md:p-12 flex flex-col justify-between overflow-hidden transition-all duration-500 ease-in-out ${mode === 'register' ? 'md:order-last' : 'md:order-first'}`}>
        {/* Sleek Minimal Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800/30 rounded-full -ml-32 -mb-32 blur-3xl" />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="UC Enterprises Logo"
                width={40}
                height={40}
                className="object-cover"
                unoptimized
              />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-zinc-100">
              UC Enterprises
            </span>
          </div>

          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-4 pt-8"
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
              {mode === 'login' && "Welcome back."}
              {mode === 'register' && "Start your journey."}
              {mode === 'forgot' && "Reset access."}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              {mode === 'login' && "Sign in to your account to manage orders, access saved items, and view exclusive offers."}
              {mode === 'register' && "Create a secure account today to experience seamless checkout and member-only benefits."}
              {mode === 'forgot' && "Enter your email and we'll send you secure instructions to reset your password."}
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-zinc-300">
              <CheckCircle2 className="w-5 h-5 text-zinc-500" />
              <span className="text-sm font-medium">Fast, reliable fulfillment</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <ShieldCheck className="w-5 h-5 text-zinc-500" />
              <span className="text-sm font-medium">Secure, encrypted checkout</span>
            </div>
          </div>

          <button
            onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-white hover:text-zinc-900 font-medium rounded-lg h-12 transition-colors duration-200"
          >
            {mode === 'login' ? "Create an account" : "Sign in to existing account"}
          </button>
        </div>
      </div>

      {/* Forms Container */}
      <div className="flex-1 p-8 md:p-16 bg-white flex items-center justify-center">
        <AnimatePresence mode="wait">

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-8"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Sign In</h1>
                <p className="text-sm text-zinc-500">Access your dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        name="email" type="email" placeholder="name@company.com" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-700">Password</label>
                      <button type="button" onClick={() => changeMode("forgot")} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        name="password" type="password" placeholder="••••••••" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Sign in <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-8"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Create Account</h1>
                <p className="text-sm text-zinc-500">Enter your details to get started</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <input type="hidden" name="redirectTo" value={returnTo} />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        name="name" type="text" placeholder="John Doe" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        name="email" type="email" placeholder="john@company.com" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Password</label>
                      <input
                        name="password" type="password" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-4 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Confirm</label>
                      <input
                        name="confirmPassword" type="password" required
                        className="w-full bg-white border border-zinc-300 text-zinc-900 px-4 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-1">
                  <div className="flex items-center h-5">
                    <input type="checkbox" required className="w-4 h-4 border-zinc-300 rounded text-zinc-900 focus:ring-zinc-900" id="terms-auth" />
                  </div>
                  <label htmlFor="terms-auth" className="text-xs text-zinc-500 leading-relaxed">
                    By creating an account, you agree to our <Link href="/terms" className="text-zinc-900 hover:underline font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-zinc-900 hover:underline font-medium">Privacy Policy</Link>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-8"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Recover Password</h1>
                <p className="text-sm text-zinc-500">We'll send you reset instructions</p>
              </div>

              <form onSubmit={handleForgot} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      name="email" type="email" placeholder="name@company.com" required
                      className="w-full bg-white border border-zinc-300 text-zinc-900 px-10 py-3 text-sm rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Send Instructions <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                    className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: { user: u } }] = await Promise.all([
        supabase.from("categories").select("id, name, slug, parent_id").eq("status", "Active").order("name"),
        (supabase.auth as any).getUser()
      ]);
      setCategories(cats || []);
      setUser(u);
    }
    fetchData();
  }, [supabase]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Header categories={categories} user={user} />

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 md:py-20 px-4 sm:px-6">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <p className="text-sm font-medium text-zinc-500">Loading secure environment...</p>
          </div>
        }>
          <AuthContainer />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}