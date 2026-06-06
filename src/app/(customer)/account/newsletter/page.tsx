"use client";

import { useEffect, useState } from "react";
import { Mail, Bell, ShieldCheck, Loader2, Save, ArrowRight, Settings2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function NewsletterPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState([
    { id: "inv", title: "Back in Stock Alerts", desc: "Get notified immediately when high-demand materials are available.", active: true },
    { id: "tech", title: "New Equipment Releases", desc: "Stay informed on new arrivals in tools, electronics, and supplies.", active: true },
    { id: "prom", title: "Bulk Deals & Seasonal Pricing", desc: "Access special procurement rates and exclusive volume discounts.", active: false },
    { id: "patch", title: "Critical Service Communications", desc: "Essential documentation, support logs, and fulfillment updates.", active: true },
  ]);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, newsletter_settings")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setPhone(profile.phone || "");
          if (profile.newsletter_settings) {
            const settings = profile.newsletter_settings as Record<string, boolean>;
            setTopics(prev => prev.map(topic => ({
              ...topic,
              active: settings[topic.id] ?? topic.active
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const toggleTopic = (id: string) => {
    setTopics(prev => prev.map(topic =>
      topic.id === id ? { ...topic, active: !topic.active } : topic
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const settings = topics.reduce((acc, topic) => ({
        ...acc,
        [topic.id]: topic.active
      }), {});

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          newsletter_settings: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      toast.success("Notification preferences updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Email Updates</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage product launches and stock logistics subscription channels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Settings Card */}
        <Card className="border-zinc-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Email Subscription Channels</CardTitle>
                <CardDescription className="text-xs">Toggle individual channels to customize your inbox experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic) => (
                <label
                  key={topic.id}
                  className={`flex items-start justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    topic.active
                      ? "bg-gray-50 border-indigo-600"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <h4 className="font-medium text-sm text-zinc-900">{topic.title}</h4>
                    <p className="text-xs text-zinc-500 leading-normal">{topic.desc}</p>
                  </div>
                  <Switch
                    checked={topic.active}
                    onCheckedChange={() => toggleTopic(topic.id)}
                  />
                </label>
              ))}
            </div>

            <Separator className="bg-zinc-200" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Privacy protected. Unsubscribe any time.
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS Alert Section */}
        <Card className="bg-indigo-950 text-white border-zinc-850 relative overflow-hidden group">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 bg-indigo-900 px-3 py-1 rounded-md border border-indigo-850 w-fit">
                <Bell className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">Logistics Notification</span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">Mobile SMS Alerts</h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md">
                  {phone
                    ? `Your alerts are currently active for ${phone}. We only send high-priority logistics updates.`
                    : "Bridge the gap with instant mobile alerts for critical supply chain and delivery milestones."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = "/account/profile"}
              className="h-11 bg-white text-indigo-950 hover:bg-indigo-50 font-medium px-6 rounded-lg w-full md:w-auto flex items-center justify-center gap-2 text-sm shadow-md shrink-0"
            >
              {phone ? "Change Registered Number" : "Enable SMS Alerts"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
