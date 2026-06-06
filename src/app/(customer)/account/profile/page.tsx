"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { User, Mail, Phone, Save, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    full_name: "",
    email: "",
    phone: "",
    address: ""
  });
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await (supabase.auth as any).getUser();
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error && error.code !== "PGRST116") throw error;

          if (data) {
            setProfile(data);
          } else {
            setProfile({
              full_name: user.user_metadata?.full_name || "",
              email: user.email || "",
              phone: "",
              address: ""
            });
          }
        }
      } catch (error: any) {
        toast.error(error.message || "Error fetching profile");
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [supabase]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Personal Information</h1>
          <p className="text-sm text-zinc-500 mt-1">Update your profile details and contact information</p>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={saving}
          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Form Area */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-zinc-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Account Information</CardTitle>
                  <CardDescription className="text-xs">Your personal and business details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-zinc-700">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      id="full_name"
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="pl-10 h-11 border-zinc-200"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700">Registered Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <Input
                      type="email"
                      value={profile.email}
                      disabled
                      className="pl-10 h-11 border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-zinc-700">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      id="phone"
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+91 00000 00000"
                      className="pl-10 h-11 border-zinc-200"
                    />
                  </div>
                </div>


              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <Card className="bg-indigo-950 text-white border-zinc-850">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-400">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-900">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">Account Type</span>
                </div>
                <Badge variant="secondary" className="bg-indigo-800 text-indigo-200 border-indigo-750 text-xs">
                  {profile.role === 'admin' ? 'Admin' : 'Customer'}
                </Badge>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-indigo-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-400">Status</span>
                </div>
                <span className="text-xs font-medium text-emerald-400">Active</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">Joined</span>
                </div>
                <span className="text-xs font-medium text-zinc-200">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-gray-50">
            <CardContent className="py-5">
              <h3 className="text-xs font-semibold text-zinc-900 mb-2">Support Note</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Updating your mobile number ensures you receive real-time SMS alerts for delivery status and OTPs for secure transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}