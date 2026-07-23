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
  const initialMode = (searchParams.get("mode") as "login" | "register") || "login";
  const returnTo = searchParams.get("returnTo") || "/account/profile";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState<"none" | "email" | "google">("none");

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading("none");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "suspended") {
        toast.error("Your account has been suspended. Please contact support for assistance.");
      } else if (errorParam.toLowerCase().includes("expired") || errorParam.toLowerCase().includes("invalid")) {
        toast.error("The link you clicked is invalid or has expired. Please request a new one.");
      } else {
        toast.error(errorParam.replace(/\+/g, ' '));
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const nextMode = params.get("mode") || "login";
      const nextReturn = params.get("returnTo") || "/account/profile";
      router.replace(`/login?mode=${nextMode}&returnTo=${encodeURIComponent(nextReturn)}`, { scroll: false });
    }
  }, [searchParams, router]);

  async function handleGoogleSignIn() {
    setLoading("google");
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(returnTo)}`,
        },
      });
      if (error) {
        toast.error(error.message);
        setLoading("none");
      }
    } catch (e: any) {
      toast.error(e?.message || "An unexpected error occurred");
      setLoading("none");
    }
  }

  const changeMode = (newMode: "login" | "register") => {
    setMode(newMode);
    router.replace(`/login?mode=${newMode}&returnTo=${encodeURIComponent(returnTo)}`, { scroll: false });
  };

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("email");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Email not confirmed. Please check your email to verify your account.");
      } else {
        toast.error(error.message);
      }
      setLoading("none");
    } else {
      // Verify user has customer role and is not suspended
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", data.user?.id)
        .single();

      if (profileError || profile?.role !== "customer") {
        await supabase.auth.signOut();
        toast.error("Unauthorized: Customer credentials required.");
        setLoading("none");
      } else if (profile?.status === "suspended") {
        await supabase.auth.signOut();
        toast.error("Your account has been suspended. Please contact support for assistance.");
        setLoading("none");
      } else {
        toast.success("Welcome back!");
        window.location.href = returnTo;
      }
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (formData.get('password') !== formData.get('confirmPassword')) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading("email");
    const result = await signup(formData);

    if (result?.error) {
      toast.error(result.error);
      setLoading("none");
    } else if (result?.success) {
      toast.success("Welcome! Check your email to verify your account.");
      changeMode("login");
      setLoading("none");
    }
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row min-h-[600px] border border-zinc-200">

      {/* Visual Side Panel - "The Experience" */}
      <div className={`relative w-full md:w-5/12 bg-zinc-50 text-zinc-900 p-10 md:p-12 flex flex-col justify-between overflow-hidden transition-all duration-500 ease-in-out ${mode === 'register' ? 'md:order-last border-l border-zinc-200' : 'md:order-first border-r border-zinc-200'}`}>
        {/* Sleek Minimal Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full -mr-64 -mt-64 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/[0.04] rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="UC Enterprises"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-zinc-800">
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
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 leading-tight">
              {mode === 'login' && "Welcome back."}
              {mode === 'register' && "Start your journey."}
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-medium">
              {mode === 'login' && "Sign in to your account to manage orders, access saved items, and view exclusive offers."}
              {mode === 'register' && "Create a secure account today to experience seamless checkout and member-only benefits."}
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

          <button
            onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
            className="w-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 font-bold rounded-xl h-12 transition-all duration-200 active:scale-95 shadow-sm"
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
                      <Link prefetch={false} href="/forgot-password" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                        Forgot password?
                      </Link>
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
                  disabled={loading !== "none"}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Sign in <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-zinc-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading !== "none"}
                  className="w-full h-12 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading === "google" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path
                        fill="#EA4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.19 2.709 1.24 6.645l4.026 3.12z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M16.04 15.34C14.95 16.03 13.56 16.45 12 16.45c-2.91 0-5.382-1.973-6.26-4.636L1.71 14.9C3.69 18.96 7.8 21.72 12 21.72c3.07 0 5.86-1.01 7.95-2.73l-3.91-3.65z"
                      />
                      <path
                        fill="#4285F4"
                        d="M19.95 18.99c2.51-2.07 3.96-5.51 3.96-9.54 0-.64-.06-1.25-.17-1.85H12v4.51h6.63c-.29 1.53-1.15 2.82-2.45 3.68l3.77 3.2z"
                      />
                      <path
                        fill="#34A853"
                        d="M5.74 11.814a7.07 7.07 0 0 1 0-2.063l-4.02-3.13A11.932 11.932 0 0 0 0 12c0 2.21.6 4.3 1.72 6.12l4.02-3.126z"
                      />
                    </svg>
                  )}
                  Continue with Google
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
                    By creating an account, you agree to our <Link prefetch={false} href="/terms-of-service" className="text-zinc-900 hover:underline font-medium">Terms of Service</Link> and <Link prefetch={false} href="/privacy-policy" className="text-zinc-900 hover:underline font-medium">Privacy Policy</Link>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading !== "none"}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-zinc-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading !== "none"}
                  className="w-full h-12 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading === "google" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path
                        fill="#EA4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.19 2.709 1.24 6.645l4.026 3.12z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M16.04 15.34C14.95 16.03 13.56 16.45 12 16.45c-2.91 0-5.382-1.973-6.26-4.636L1.71 14.9C3.69 18.96 7.8 21.72 12 21.72c3.07 0 5.86-1.01 7.95-2.73l-3.91-3.65z"
                      />
                      <path
                        fill="#4285F4"
                        d="M19.95 18.99c2.51-2.07 3.96-5.51 3.96-9.54 0-.64-.06-1.25-.17-1.85H12v4.51h6.63c-.29 1.53-1.15 2.82-2.45 3.68l3.77 3.2z"
                      />
                      <path
                        fill="#34A853"
                        d="M5.74 11.814a7.07 7.07 0 0 1 0-2.063l-4.02-3.13A11.932 11.932 0 0 0 0 12c0 2.21.6 4.3 1.72 6.12l4.02-3.126z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </button>
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

      {/* Main Content Area */}
      <main className="w-full flex-1 flex items-center justify-center py-12 md:py-20 px-4 sm:px-6">
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