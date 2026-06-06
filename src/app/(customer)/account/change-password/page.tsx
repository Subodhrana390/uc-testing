"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, Save, KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function ChangePasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setFormData({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Security Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Keep your account secure with a strong, unique password</p>
      </div>

      <Card className="border-zinc-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-zinc-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Update Password</CardTitle>
              <CardDescription className="text-xs">Enter your new credential details below</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="pl-10 pr-10 h-11 border-zinc-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  className="pl-10 pr-10 h-11 border-zinc-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Separator className="bg-zinc-200 my-4" />

            <div className="flex items-center justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
