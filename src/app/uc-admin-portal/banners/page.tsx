"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Image as ImageIcon,
  Save,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  X,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/pagination";
import SingleImageUpload from "@/components/admin/SingleImageUpload";

// shadcn/ui primitives
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", subtitle: "", image_url: "", link_url: "", link_text: "", position: 0, status: true });
  const [bannerToDelete, setBannerToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const supabase = useMemo(() => createClient(), []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase.from("banners").select("*").order("position", { ascending: true });
      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, [supabase]);

  const filteredBanners = useMemo(() => {
    return banners.filter(b =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [banners, searchQuery]);

  const paginatedBanners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBanners.slice(start, start + pageSize);
  }, [filteredBanners, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleOpenDrawer = (banner?: any) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({ title: banner.title, subtitle: banner.subtitle || "", image_url: banner.image_url || "", link_url: banner.link_url || "", link_text: banner.link_text || "", position: banner.position, status: banner.status });
    } else {
      setEditingBanner(null);
      setFormData({ title: "", subtitle: "", image_url: "", link_url: "", link_text: "", position: banners.length, status: true });
    }
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) { toast.error("Banner title is required"); return; }
    setSaving(true);
    try {
      if (editingBanner) {
        const { error } = await supabase.from("banners").update(formData).eq("id", editingBanner.id);
        if (error) throw error;
        toast.success("Banner updated");
      } else {
        const { error } = await supabase.from("banners").insert([formData]);
        if (error) throw error;
        toast.success("Banner created");
      }
      setIsDrawerOpen(false);
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from("banners").update({ status: !current }).eq("id", id);
      if (error) throw error;
      setBanners(banners.map(b => b.id === id ? { ...b, status: !current } : b));
      toast.success(current ? "Banner hidden" : "Banner activated");
    } catch (error: any) { toast.error(error.message); }
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("banners").delete().eq("id", bannerToDelete.id);
      if (error) throw error;
      setBanners(banners.filter(b => b.id !== bannerToDelete.id));
      toast.success("Banner deleted");
      setBannerToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LogoLoader text="Loading homepage banners..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 relative">
      {/* Yellow/Amber Gradient Banner */}
      <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-amber-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Hero Content</h1>
            <p className="text-sm font-medium text-yellow-50 mt-1">Manage storefront banners and carousel promotions</p>
          </div>
          <Button
            onClick={() => handleOpenDrawer()}
            className="h-11 px-5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" /> Initialize Banner
          </Button>
        </div>

        {/* Analytics Summary Core Matrix */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-3 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-yellow-100 uppercase tracking-wider">Total Banners</span>
              <Layers className="w-4 h-4 text-yellow-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">{banners.length}</div>
              <p className="text-[11px] text-yellow-200/70 mt-1">Promotional frames</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-yellow-100 uppercase tracking-wider">Active Listings</span>
              <Zap className="w-4 h-4 text-yellow-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {banners.filter(b => b.status).length}
              </div>
              <p className="text-[11px] text-yellow-200/70 mt-1">Live in store hero slider</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-yellow-100 uppercase tracking-wider">Hidden / Suspended</span>
              <EyeOff className="w-4 h-4 text-yellow-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black tracking-tight text-white">
                {banners.filter(b => !b.status).length}
              </div>
              <p className="text-[11px] text-yellow-200/70 mt-1">Draft or suspended</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden py-0 gap-0">
        {/* Filtration Header */}
        <div className="p-5 border-b border-zinc-100 bg-zinc-50/30">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search banners by title or subtitle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all duration-150 animate-in fade-in zoom-in-75"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-32 pl-8">Visual</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Context</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="w-24 pr-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedBanners.map((banner) => (
                <tr key={banner.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                  <td className="px-6 py-4 pl-8">
                    <div className="w-20 h-12 bg-zinc-100 border border-zinc-200/60 rounded-xl overflow-hidden transition-all flex items-center justify-center shrink-0">
                      {banner.image_url ? (
                        <Image src={banner.image_url} alt="" width={80} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-zinc-700 block">{banner.title}</span>
                      <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block line-clamp-1">{banner.subtitle || "No Subtitle"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {banner.link_url ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 px-2.5 py-1.5 rounded-lg w-fit">
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-450" />
                        <span className="truncate max-w-[140px] font-mono">{banner.link_url}</span>
                      </div>
                    ) : <span className="text-xs text-zinc-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={banner.status}
                        onCheckedChange={() => handleToggleActive(banner.id, banner.status)}
                        className="data-[state=checked]:bg-yellow-500"
                      />
                      <span
                        onClick={() => handleToggleActive(banner.id, banner.status)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer select-none",
                          banner.status
                            ? "bg-yellow-50 text-yellow-800 border-yellow-100 hover:bg-yellow-100/80"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200/80"
                        )}
                      >
                        {banner.status && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />}
                        {banner.status ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right pr-8 relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-all ml-auto">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border-zinc-200 shadow-lg rounded-xl p-1.5">
                        <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">
                          Banner Options
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleOpenDrawer(banner)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg cursor-pointer"
                        >
                          <Edit className="w-4 h-4 text-zinc-400" /> Edit Content
                        </DropdownMenuItem>
                        <div className="h-px bg-zinc-100 my-1 mx-1" />
                        <DropdownMenuItem
                          onClick={() => setBannerToDelete(banner)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all rounded-lg cursor-pointer focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBanners.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredBanners.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            variantColor="yellow"
          />
        )}

        {/* Empty Fallback State */}
        {filteredBanners.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
            <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
              <ImageIcon className="w-8 h-8 text-zinc-300" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-bold text-[#18181b]">No Banners Found</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">We couldn't find any storefront banners matching your search query.</p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs border-zinc-200 hover:bg-zinc-50"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Drawer via Shadcn Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">Banner Specification</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Configure layout properties and visual assets details.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Primary Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium text-zinc-500">Primary Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                placeholder="e.g. MEGA SUMMER SALE"
              />
            </div>

            {/* Context / Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-xs font-medium text-zinc-500">Context / Subtitle</Label>
              <Textarea
                id="subtitle"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                className="min-h-[100px] border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400 resize-none"
                placeholder="Additional promotional descriptive line text..."
              />
            </div>

            {/* Visual URL & Position */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-500">Banner Image</Label>
              <SingleImageUpload
                value={formData.image_url}
                onChange={(url: string) => setFormData({ ...formData, image_url: url })}
                label="Select Banner Image"
                bucket="banners"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-xs font-medium text-zinc-500">Sequence Position</Label>
              <Input
                id="position"
                type="number"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
              />
            </div>

            {/* Destination Link */}
            <div className="space-y-2">
              <Label htmlFor="link_url" className="text-xs font-medium text-zinc-500">Destination Link</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                placeholder="/products/welding-kit"
              />
            </div>
          </form>

          {/* Form Action Footer */}
          <div className="p-6 border-t border-zinc-100 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handleSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Finalize Specification
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!bannerToDelete} onOpenChange={(open) => !open && setBannerToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Banner</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{bannerToDelete?.title || "this banner"}</span>? This will remove the banner permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setBannerToDelete(null)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Banner
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}