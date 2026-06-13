"use client";

import { useEffect, useState, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Settings,
  Globe,
  Award,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  ChevronUp,
  ChevronDown,
  Check,
  ExternalLink,
  MessageSquare,
  Share2,
  PlusCircle,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
import LogoLoader from "@/components/ui/LogoLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  updateSiteSettingsAction,
  createNavigationLinkAction,
  updateNavigationLinkAction,
  deleteNavigationLinkAction,
  reorderNavigationLinksAction,
  SiteSettings,
  NavigationLink,
} from "@/app/actions/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");

  // Site Settings Form States
  const [identityForm, setIdentityForm] = useState({
    site_name: "",
    logo_url: "",
    favicon_url: "",
    contact_phone: "",
    contact_email: "",
    contact_address: "",
  });

  const [whatsappForm, setWhatsappForm] = useState({
    whatsapp_number: "",
    whatsapp_message: "",
    whatsapp_enabled: true,
  });

  const [socialForm, setSocialForm] = useState({
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  });

  const [seoForm, setSeoForm] = useState({
    seo_title_default: "",
    seo_description_default: "",
    seo_keywords_default: "",
  });

  const [featuresForm, setFeaturesForm] = useState({
    emi_enabled: true,
    coupons_enabled: true,
  });

  // Saving state
  const [savingSettings, setSavingSettings] = useState(false);

  // Link Dialog states
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<NavigationLink | null>(null);
  const [linkFormData, setLinkFormData] = useState({
    label: "",
    url: "",
    order_index: 0,
    is_active: true,
    is_external: false,
  });
  const [savingLink, setSavingLink] = useState(false);

  // Delete Link confirmation state
  const [linkToDelete, setLinkToDelete] = useState<NavigationLink | null>(null);
  const [deletingLink, setDeletingLink] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = async () => {
    try {
      // 1. Fetch site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData);
        setIdentityForm({
          site_name: settingsData.site_name || "",
          logo_url: settingsData.logo_url || "",
          favicon_url: settingsData.favicon_url || "",
          contact_phone: settingsData.contact_phone || "",
          contact_email: settingsData.contact_email || "",
          contact_address: settingsData.contact_address || "",
        });
        setWhatsappForm({
          whatsapp_number: settingsData.whatsapp_number || "",
          whatsapp_message: settingsData.whatsapp_message || "",
          whatsapp_enabled: settingsData.whatsapp_enabled ?? true,
        });
        const socials = settingsData.social_links || {};
        setSocialForm({
          facebook: socials.facebook || "",
          twitter: socials.twitter || "",
          instagram: socials.instagram || "",
          linkedin: socials.linkedin || "",
          youtube: socials.youtube || "",
        });
        setSeoForm({
          seo_title_default: settingsData.seo_title_default || "",
          seo_description_default: settingsData.seo_description_default || "",
          seo_keywords_default: (settingsData.seo_keywords_default || []).join(", "),
        });
        setFeaturesForm({
          emi_enabled: settingsData.emi_enabled ?? true,
          coupons_enabled: settingsData.coupons_enabled ?? true,
        });
      }

      // 2. Fetch navigation links
      const { data: linksData, error: linksError } = await supabase
        .from("navigation_links")
        .select("*")
        .order("order_index", { ascending: true });

      if (linksError) throw linksError;
      setLinks(linksData || []);

    } catch (err: any) {
      console.error("Error loading settings:", err);
      toast.error(err.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  // Handle saving of all settings sections
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    // Form validations
    if (activeTab === "identity") {
      if (!identityForm.site_name.trim()) {
        toast.error("Site name is required");
        setSavingSettings(false);
        return;
      }
      if (identityForm.contact_email && !/\S+@\S+\.\S+/.test(identityForm.contact_email)) {
        toast.error("Invalid contact email format");
        setSavingSettings(false);
        return;
      }
    }

    if (activeTab === "whatsapp") {
      if (whatsappForm.whatsapp_enabled && !whatsappForm.whatsapp_number.trim()) {
        toast.error("WhatsApp number is required when button is enabled");
        setSavingSettings(false);
        return;
      }
    }

    try {
      let updatePayload: Partial<SiteSettings> = {};

      if (activeTab === "identity") {
        updatePayload = { ...identityForm };
      } else if (activeTab === "whatsapp") {
        updatePayload = { ...whatsappForm };
      } else if (activeTab === "social") {
        updatePayload = { social_links: socialForm };
      } else if (activeTab === "seo") {
        const keywords = seoForm.seo_keywords_default
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        updatePayload = {
          seo_title_default: seoForm.seo_title_default,
          seo_description_default: seoForm.seo_description_default,
          seo_keywords_default: keywords,
        };
      } else if (activeTab === "features") {
        updatePayload = { ...featuresForm };
      }

      const result = await updateSiteSettingsAction(updatePayload);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Settings updated successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Move link up/down (reordering)
  const handleMoveLink = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newLinks = [...links];
    const tempOrder = newLinks[index].order_index;
    newLinks[index].order_index = newLinks[targetIndex].order_index;
    newLinks[targetIndex].order_index = tempOrder;

    const toastId = toast.loading("Updating menu order...");
    try {
      const result = await reorderNavigationLinksAction([
        { id: newLinks[index].id, order_index: newLinks[index].order_index },
        { id: newLinks[targetIndex].id, order_index: newLinks[targetIndex].order_index },
      ]);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Navigation order updated", { id: toastId });
      setLinks(newLinks.sort((a, b) => a.order_index - b.order_index));
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder links", { id: toastId });
    }
  };

  // Toggle active status of a link directly
  const handleToggleLinkActive = async (link: NavigationLink, activeState: boolean) => {
    const toastId = toast.loading("Updating link status...");
    try {
      const result = await updateNavigationLinkAction(link.id, { is_active: activeState });
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success(`Link is now ${activeState ? "Active" : "Inactive"}`, { id: toastId });
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: activeState } : l));
    } catch (err: any) {
      toast.error(err.message || "Failed to update link status", { id: toastId });
    }
  };

  // Open Add/Edit link dialog
  const handleOpenLinkDialog = (link?: NavigationLink) => {
    if (link) {
      setEditingLink(link);
      setLinkFormData({
        label: link.label,
        url: link.url,
        order_index: link.order_index,
        is_active: link.is_active,
        is_external: link.is_external,
      });
    } else {
      setEditingLink(null);
      // Auto increment order index based on last link
      const lastOrderIndex = links.length > 0 ? links[links.length - 1].order_index : 0;
      setLinkFormData({
        label: "",
        url: "",
        order_index: lastOrderIndex + 10,
        is_active: true,
        is_external: false,
      });
    }
    setIsLinkDialogOpen(true);
  };

  // Submit Add/Edit link form
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkFormData.label.trim()) {
      toast.error("Link label is required");
      return;
    }
    if (!linkFormData.url.trim()) {
      toast.error("Link target URL is required");
      return;
    }

    setSavingLink(true);
    try {
      if (editingLink) {
        const result = await updateNavigationLinkAction(editingLink.id, linkFormData);
        if (!result.success) throw new Error(result.error);
        toast.success("Menu link updated successfully");
      } else {
        const result = await createNavigationLinkAction(linkFormData);
        if (!result.success) throw new Error(result.error);
        toast.success("Menu link added successfully");
      }
      setIsLinkDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSavingLink(false);
    }
  };

  // Confirm and delete link
  const handleConfirmDeleteLink = async () => {
    if (!linkToDelete) return;
    setDeletingLink(true);
    try {
      const result = await deleteNavigationLinkAction(linkToDelete.id);
      if (!result.success) throw new Error(result.error);
      toast.success("Menu link deleted successfully");
      setLinks(prev => prev.filter(l => l.id !== linkToDelete.id));
      setLinkToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete menu link");
    } finally {
      setDeletingLink(false);
    }
  };

  if (loading) return <LogoLoader text="Loading site configuration..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-10">
      {/* Header UI Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden mb-6 transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-600/20 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-slate-500/10 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-500 flex items-center justify-center shadow-lg shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight pl-0 before:hidden border-0">
                Site Settings
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-350 mt-1">
                Customize identity, social properties, SEO templates, and header navigation menu
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar Tabs List */}
        <div className="lg:col-span-1">
          <TabsList className="bg-white border border-zinc-150 p-2 rounded-2xl flex flex-col gap-1.5 h-auto w-full shadow-sm text-left">
            <TabsTrigger
              value="identity"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <Award className="w-4 h-4" /> Site Identity
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp Config
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <Share2 className="w-4 h-4" /> Social Links
            </TabsTrigger>
            <TabsTrigger
              value="seo"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <Globe className="w-4 h-4" /> SEO Defaults
            </TabsTrigger>
            <TabsTrigger
              value="menus"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <PlusCircle className="w-4 h-4" /> Header Menu Links
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="w-full justify-start rounded-xl px-4 py-3 text-xs font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white hover:bg-zinc-50 transition-all gap-2 flex items-center text-left"
            >
              <Settings className="w-4 h-4" /> Store Features
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Configurations Form Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Site Identity tab */}
          <TabsContent value="identity" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left">
                <CardTitle className="text-lg font-black text-zinc-900 uppercase">Site Identity</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Configure branding logo, name, favicon and support contact details.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="site_name" className="text-xs font-bold text-zinc-700">Site Name</Label>
                      <Input
                        id="site_name"
                        value={identityForm.site_name}
                        onChange={(e) => setIdentityForm({ ...identityForm, site_name: e.target.value })}
                        placeholder="e.g. UC Enterprises"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="contact_email" className="text-xs font-bold text-zinc-700">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={identityForm.contact_email}
                        onChange={(e) => setIdentityForm({ ...identityForm, contact_email: e.target.value })}
                        placeholder="e.g. ucenterprises1@gmail.com"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="contact_phone" className="text-xs font-bold text-zinc-700">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={identityForm.contact_phone}
                        onChange={(e) => setIdentityForm({ ...identityForm, contact_phone: e.target.value })}
                        placeholder="e.g. +91 98888 63377"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="contact_address" className="text-xs font-bold text-zinc-700">Physical Address</Label>
                      <Textarea
                        id="contact_address"
                        value={identityForm.contact_address}
                        onChange={(e) => setIdentityForm({ ...identityForm, contact_address: e.target.value })}
                        placeholder="e.g. Shop No. 1, Bela Road, Ropar, Punjab"
                        className="rounded-xl text-sm min-h-[44px] py-2.5"
                      />
                    </div>
                  </div>

                  {/* Logo and Favicon uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-100">
                    <div className="text-left">
                      <SingleImageUpload
                        label="Store Logo"
                        value={identityForm.logo_url}
                        onChange={(url) => setIdentityForm({ ...identityForm, logo_url: url })}
                        bucket="site-assets"
                      />
                      <p className="text-[10px] text-zinc-400 mt-2 font-medium">Recommended: Transparent background PNG, 200x200px size.</p>
                    </div>
                    <div className="text-left">
                      <SingleImageUpload
                        label="Website Favicon"
                        value={identityForm.favicon_url}
                        onChange={(url) => setIdentityForm({ ...identityForm, favicon_url: url })}
                        bucket="site-assets"
                      />
                      <p className="text-[10px] text-zinc-400 mt-2 font-medium">Recommended: ICO, PNG format, square aspect ratio, 32x32px or 64x64px.</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-zinc-100">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Site Identity
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Config tab */}
          <TabsContent value="whatsapp" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left">
                <CardTitle className="text-lg font-black text-zinc-900 uppercase">WhatsApp Floating Button</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Configure a floating WhatsApp button in the corner to chat directly with customers.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                    <div className="space-y-0.5 text-left">
                      <Label htmlFor="whatsapp_enabled" className="text-sm font-bold text-zinc-800 cursor-pointer">Enable Floating Button</Label>
                      <p className="text-[10px] text-zinc-400 font-medium leading-normal">Toggle display of the WhatsApp icon in the bottom-right corner of the site.</p>
                    </div>
                    <Switch
                      id="whatsapp_enabled"
                      checked={whatsappForm.whatsapp_enabled}
                      onCheckedChange={(checked) => setWhatsappForm({ ...whatsappForm, whatsapp_enabled: checked })}
                      className="data-[state=checked]:bg-[#25D366] bg-black"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="whatsapp_number" className="text-xs font-bold text-zinc-700">WhatsApp Number</Label>
                      <Input
                        id="whatsapp_number"
                        value={whatsappForm.whatsapp_number}
                        onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsapp_number: e.target.value })}
                        placeholder="e.g. 919888863377 (With Country Code, Numbers only, No spaces or '+')"
                        className="h-11 rounded-xl text-sm"
                      />
                      <span className="text-[9px] text-zinc-400 leading-normal block font-medium">
                        IMPORTANT: Must be in international format without leading plus (+) sign or dashes. E.g. `919888863377` for India.
                      </span>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label htmlFor="whatsapp_message" className="text-xs font-bold text-zinc-700">Default Chat Message</Label>
                      <Textarea
                        id="whatsapp_message"
                        value={whatsappForm.whatsapp_message}
                        onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsapp_message: e.target.value })}
                        placeholder="Hello UC Enterprises, I have a query about..."
                        className="rounded-xl text-sm min-h-[80px]"
                      />
                      <span className="text-[9px] text-zinc-400 leading-normal block font-medium">
                        Pre-populated message that appears in the customer's text box when they open the WhatsApp chat link.
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-zinc-100">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save WhatsApp Config
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Links tab */}
          <TabsContent value="social" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left">
                <CardTitle className="text-lg font-black text-zinc-900 uppercase">Social Links</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Configure company profiles links to show in footer and social embeds.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="instagram" className="text-xs font-bold text-zinc-700">Instagram Profile URL</Label>
                      <Input
                        id="instagram"
                        value={socialForm.instagram}
                        onChange={(e) => setSocialForm({ ...socialForm, instagram: e.target.value })}
                        placeholder="https://instagram.com/your-brand"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="facebook" className="text-xs font-bold text-zinc-700">Facebook Page URL</Label>
                      <Input
                        id="facebook"
                        value={socialForm.facebook}
                        onChange={(e) => setSocialForm({ ...socialForm, facebook: e.target.value })}
                        placeholder="https://facebook.com/your-brand"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="twitter" className="text-xs font-bold text-zinc-700">Twitter / X URL</Label>
                      <Input
                        id="twitter"
                        value={socialForm.twitter}
                        onChange={(e) => setSocialForm({ ...socialForm, twitter: e.target.value })}
                        placeholder="https://twitter.com/your-brand"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="linkedin" className="text-xs font-bold text-zinc-700">LinkedIn Company URL</Label>
                      <Input
                        id="linkedin"
                        value={socialForm.linkedin}
                        onChange={(e) => setSocialForm({ ...socialForm, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/company/your-brand"
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left max-w-md">
                    <Label htmlFor="youtube" className="text-xs font-bold text-zinc-700">YouTube Channel URL</Label>
                    <Input
                      id="youtube"
                      value={socialForm.youtube}
                      onChange={(e) => setSocialForm({ ...socialForm, youtube: e.target.value })}
                      placeholder="https://youtube.com/c/your-brand"
                      className="h-11 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-zinc-100">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Social Links
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Defaults tab */}
          <TabsContent value="seo" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left">
                <CardTitle className="text-lg font-black text-zinc-900 uppercase">SEO Defaults</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Configure default browser page titles, description tags, and default keyword listings.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="seo_title_default" className="text-xs font-bold text-zinc-700">Default Title Tag</Label>
                    <Input
                      id="seo_title_default"
                      value={seoForm.seo_title_default}
                      onChange={(e) => setSeoForm({ ...seoForm, seo_title_default: e.target.value })}
                      placeholder="e.g. UC Enterprises — Laboratory, Industrial & Safety Supplies India"
                      className="h-11 rounded-xl text-sm"
                    />
                    <span className="text-[9px] text-zinc-400 font-medium">Recommended length: 50-60 characters.</span>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="seo_description_default" className="text-xs font-bold text-zinc-700">Default Meta Description</Label>
                    <Textarea
                      id="seo_description_default"
                      value={seoForm.seo_description_default}
                      onChange={(e) => setSeoForm({ ...seoForm, seo_description_default: e.target.value })}
                      placeholder="UC Enterprises is India's trusted B2B portal for lab chemicals..."
                      className="rounded-xl text-sm min-h-[80px]"
                    />
                    <span className="text-[9px] text-zinc-400 font-medium">Recommended length: 150-160 characters. Provide a summary of the store.</span>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="seo_keywords_default" className="text-xs font-bold text-zinc-700">Default Keywords (Comma-Separated)</Label>
                    <Textarea
                      id="seo_keywords_default"
                      value={seoForm.seo_keywords_default}
                      onChange={(e) => setSeoForm({ ...seoForm, seo_keywords_default: e.target.value })}
                      placeholder="laboratory chemicals, lab glassware, industrial tools, safety PPE"
                      className="rounded-xl text-sm min-h-[60px]"
                    />
                    <span className="text-[9px] text-zinc-400 font-medium">Provide terms separated by commas. E.g. `laboratory chemicals, lab glassware, industrial supplies`.</span>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-zinc-100">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save SEO Defaults
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Header Menus Links management tab */}
          <TabsContent value="menus" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black text-zinc-900 uppercase">Header Menu Links</CardTitle>
                  <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Manage header navigation layout. Click Up/Down arrows to shift display sequence.</CardDescription>
                </div>
                <Button
                  onClick={() => handleOpenLinkDialog()}
                  className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Menu Link
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {/* Links Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider pl-8">Order</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Label</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">URL Target</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Target</th>
                        <th className="px-6 py-3.5 text-xs font-bold text-zinc-400 uppercase tracking-wider pr-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {links.map((link, idx) => (
                        <tr key={link.id} className="hover:bg-zinc-50/50 transition-colors">
                          {/* Order index / Reorder controls */}
                          <td className="px-6 py-3.5 pl-8">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveLink(idx, "up")}
                                disabled={idx === 0}
                                className="w-6 h-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
                                title="Move Up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveLink(idx, "down")}
                                disabled={idx === links.length - 1}
                                className="w-6 h-6 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
                                title="Move Down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-bold text-zinc-400 min-w-[20px] text-center ml-1">{link.order_index}</span>
                            </div>
                          </td>

                          {/* Link label */}
                          <td className="px-6 py-3.5">
                            <span className="text-sm font-bold text-zinc-850">{link.label}</span>
                          </td>

                          {/* Link URL */}
                          <td className="px-6 py-3.5">
                            <span className="text-xs font-semibold text-zinc-500 font-mono bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">{link.url}</span>
                          </td>

                          {/* Status active/inactive switch */}
                          <td className="px-6 py-3.5">
                            <Switch
                              checked={link.is_active}
                              onCheckedChange={(checked) => handleToggleLinkActive(link, checked)}
                              className="data-[state=checked]:bg-zinc-900 bg-zinc-200"
                            />
                          </td>

                          {/* External link status */}
                          <td className="px-6 py-3.5">
                            {link.is_external ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                <ExternalLink className="w-2.5 h-2.5" /> External
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                                Same Window
                              </span>
                            )}
                          </td>

                          {/* Actions (edit, delete) */}
                          <td className="px-6 py-3.5 pr-8 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenLinkDialog(link)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition"
                                title="Edit Link"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setLinkToDelete(link)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition"
                                title="Delete Link"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {links.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-zinc-400 text-xs font-semibold">
                            No navigation links found. Click Add Menu Link to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features settings tab */}
          <TabsContent value="features" className="m-0 focus:outline-none">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
              <CardHeader className="border-b border-zinc-100 p-6 text-left">
                <CardTitle className="text-lg font-black text-zinc-900 uppercase">Store Features</CardTitle>
                <CardDescription className="text-xs font-medium text-zinc-400 mt-1">Enable or disable specific features across the storefront.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                    <div className="space-y-0.5 text-left">
                      <Label htmlFor="emi_enabled" className="text-sm font-bold text-zinc-800 cursor-pointer">Enable EMI Payment Option</Label>
                      <p className="text-[10px] text-zinc-400 font-medium leading-normal">Toggle customer ability to pay using EMI options at checkout.</p>
                    </div>
                    <Switch
                      id="emi_enabled"
                      checked={featuresForm.emi_enabled}
                      onCheckedChange={(checked) => setFeaturesForm({ ...featuresForm, emi_enabled: checked })}
                      className="data-[state=checked]:bg-zinc-900 bg-zinc-200"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                    <div className="space-y-0.5 text-left">
                      <Label htmlFor="coupons_enabled" className="text-sm font-bold text-zinc-800 cursor-pointer">Enable Coupons & Promotions</Label>
                      <p className="text-[10px] text-zinc-400 font-medium leading-normal">Toggle customer ability to apply discount coupon codes at checkout.</p>
                    </div>
                    <Switch
                      id="coupons_enabled"
                      checked={featuresForm.coupons_enabled}
                      onCheckedChange={(checked) => setFeaturesForm({ ...featuresForm, coupons_enabled: checked })}
                      className="data-[state=checked]:bg-zinc-900 bg-zinc-200"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-zinc-100">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Store Features
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Add / Edit Link Modal Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase text-zinc-900">
              {editingLink ? "Edit Navigation Link" : "Add Navigation Link"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 font-medium">
              Create or update store storefront header menu link elements.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkSubmit} className="space-y-4 py-2">
            <div className="space-y-2 text-left">
              <Label htmlFor="link_label" className="text-xs font-bold text-zinc-700">Link Label</Label>
              <Input
                id="link_label"
                value={linkFormData.label}
                onChange={(e) => setLinkFormData({ ...linkFormData, label: e.target.value })}
                placeholder="e.g. Special Offers"
                className="h-10 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="link_url" className="text-xs font-bold text-zinc-700">Link URL Target</Label>
              <Input
                id="link_url"
                value={linkFormData.url}
                onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
                placeholder="e.g. /products?promo=true or https://external-blog.com"
                className="h-10 rounded-xl text-sm font-mono text-xs"
              />
              <span className="text-[9px] text-zinc-400 block font-medium leading-none">
                Use relative paths (e.g. `/about`) for local pages or full URL (e.g. `https://example.com`) for external links.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="link_order" className="text-xs font-bold text-zinc-700">Order Index</Label>
                <Input
                  id="link_order"
                  type="number"
                  value={linkFormData.order_index}
                  onChange={(e) => setLinkFormData({ ...linkFormData, order_index: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              <div className="flex flex-col gap-2 justify-end pb-1 text-left">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkFormData.is_external}
                    onChange={(e) => setLinkFormData({ ...linkFormData, is_external: e.target.checked })}
                    className="w-4 h-4 rounded-sm border-zinc-350 text-zinc-950 accent-zinc-950 cursor-pointer focus:ring-0 focus:ring-offset-0"
                  />
                  Open in New Window
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-left">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={linkFormData.is_active}
                  onChange={(e) => setLinkFormData({ ...linkFormData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded-sm border-zinc-350 text-zinc-950 accent-zinc-950 cursor-pointer focus:ring-0 focus:ring-offset-0"
                />
                Active (Show in Header)
              </label>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-end gap-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingLink}
                className="h-10 px-5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {savingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingLink ? "Update Menu Link" : "Create Menu Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Link Confirmation Dialog */}
      <Dialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase text-zinc-900">Delete Menu Link</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 font-medium">
              Are you sure you want to permanently delete this navigation link? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-left">
            <p className="text-xs text-zinc-650 font-bold bg-zinc-50 p-3 rounded-xl border border-zinc-100">
              Label: <span className="text-zinc-950">{linkToDelete?.label}</span> <br />
              URL: <span className="text-zinc-500 font-mono">{linkToDelete?.url}</span>
            </p>
          </div>
          <DialogFooter className="pt-4 flex sm:justify-end gap-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkToDelete(null)}
              className="h-10 rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteLink}
              disabled={deletingLink}
              className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              {deletingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
