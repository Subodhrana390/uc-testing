"use client";

import { useState } from "react";
import { Shield, KeyRound, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { updatePassword } from "@/app/actions/auth";
import toast from "react-hot-toast";

// Shadcn UI primitives
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SecurityPage() {
  const [loading, setLoading] = useState(false);

  async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    // Client-side verification fallback matching database requirements
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await updatePassword(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Password updated successfully!");
      (e.target as HTMLFormElement).reset();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-8 p-6 lg:p-8 w-full px-4 md:px-8 2xl:px-12 mx-auto">
      {/* Lime Gradient Banner */}
      <div className="bg-gradient-to-r from-lime-600 via-lime-700 to-emerald-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">System Security</h1>
            <p className="text-sm font-medium text-lime-50 mt-1">Manage administrative credentials and system security protocols</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Security Form Input */}
        <Card className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30 flex-row gap-4 items-center space-y-0">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200/60">
              <KeyRound className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-zinc-800">
                Password Update
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div className="space-y-4">
                {/* Proposed Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="new_password"
                    className="text-xs font-medium text-zinc-500"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      id="new_password"
                      name="new_password"
                      type="password"
                      required
                      placeholder="Enter New Password"
                      className="pl-10 h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirm_password"
                    className="text-xs font-medium text-zinc-500"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      required
                      placeholder="Confirm Password"
                      className="pl-10 h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-11 px-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Changing Password
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Info Box */}
        <Card className="bg-zinc-50/50 border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-1 border-b border-zinc-100">
            <Shield className="w-4 h-4 text-lime-600" />
            <h3 className="text-sm font-bold text-zinc-800 tracking-tight">
              Security Protocol
            </h3>
          </div>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
              <p className="text-xs font-normal text-zinc-600 leading-relaxed">
                Passwords must exceed 6 characters and include complex patterns for maximum entropy.
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
              <p className="text-xs font-normal text-zinc-600 leading-relaxed">
                Administrative sessions are logged and automatically terminate after inactivity thresholds.
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
              <p className="text-xs font-normal text-zinc-600 leading-relaxed">
                Avoid recycling credentials across different operational platforms.
              </p>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}