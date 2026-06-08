"use client";

import { useEffect, useState, useMemo } from "react";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderTree,
  X,
  Save,
  Loader2,
  Filter,
  Layers,
  Eye,
  Settings,
  Grid
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import SingleImageUpload from "./SingleImageUpload";
import Image from "next/image";
import { toggleCategoryStatus } from "@/app/actions/admin";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryListProps {
  type: "main" | "sub";
}

export default function CategoryList({ type }: CategoryListProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParent, setSelectedParent] = useState("All");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
    display_order: 0,
    parent_id: null as string | null
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      const mappedData = (data || []).map((c: any) => ({
        ...c,
        is_active: c.status === true
      }));

      setAllCategories(mappedData);

      if (type === "main") {
        setCategories(mappedData.filter((c: any) => !c.parent_id));
      } else {
        setCategories(mappedData.filter((c: any) => c.parent_id));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [supabase, type]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesParent = selectedParent === "All" || c.parent_id === selectedParent;
      return matchesSearch && matchesParent;
    });
  }, [categories, searchQuery, selectedParent]);

  const handleOpenDrawer = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        is_active: category.is_active,
        display_order: category.display_order,
        parent_id: category.parent_id
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        is_active: true,
        display_order: categories.length,
        parent_id: type === "main" ? null : (allCategories.find(c => !c.parent_id)?.id || null)
      });
    }
    setIsDrawerOpen(true);
    setActiveDropdown(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === generateSlug(prev.name) || prev.slug === "" ? generateSlug(name) : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error("Name and Slug are required");
      return;
    }
    setSaving(true);
    try {
      const { is_active, ...rest } = formData;
      const submitData = {
        ...rest,
        status: is_active
      };

      if (editingCategory) {
        const { error } = await supabase.from("categories").update(submitData).eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase.from("categories").insert([submitData]);
        if (error) throw error;
        toast.success("Category created successfully");
      }
      setIsDrawerOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryToDelete.id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      toast.success("Category successfully removed");
      setCategoryToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (category: any) => {
    const toastId = toast.loading("Updating status...");
    try {
      const result = await toggleCategoryStatus(category.id, category.status);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setCategories(prev => prev.map(c => 
        c.id === category.id ? { ...c, is_active: result.newStatus, status: result.newStatus } : c
      ));
      toast.success(`Category is now ${result.newStatus ? "Active" : "Archived"}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Failed to update status", { id: toastId });
    }
  };

  if (loading) {
    return <LogoLoader text="Loading departments..." />;
  }

  const isMain = type === "main";
  return (
    <div className="space-y-6 w-full px-4 md:px-8 2xl:px-12 mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Themed Gradient Banner */}
      <div className={cn(
        "rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8",
        isMain 
          ? "bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600" 
          : "bg-gradient-to-r from-violet-600 via-violet-700 to-fuchsia-600"
      )}>
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">
              {isMain ? "Main Categories" : "Sub Categories"}
            </h1>
            <p className="text-sm font-medium text-purple-100 mt-1">
              {isMain ? "Manage top-level store departments" : "Organize detailed product groupings"}
            </p>
          </div>
          <Button
            onClick={() => handleOpenDrawer()}
            className="h-11 px-5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            Add {isMain ? "Main" : "Sub"} Category
          </Button>
        </div>

        {/* Analytics Summary Matrix */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          {[
            { title: "Total Groups", value: categories.length, label: "Registered listings" },
            { title: "Active Status", value: categories.filter(c => c.is_active).length, label: "Live in storefront" },
            { title: "Archived", value: categories.filter(c => !c.is_active).length, label: "Hidden items" },
            { title: "Max Order", value: categories.length > 0 ? Math.max(...categories.map(c => c.display_order || 0)) : 0, label: "Layout priority max" }
          ].map((c, i) => (
            <Card key={i} className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
              <CardHeader className="p-5 pb-2 space-y-0">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider block">{c.title}</span>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black tracking-tight text-white">{c.value}</div>
                <p className="text-[11px] text-white/60 mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Framework Interface */}
      <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Search & Filters Action Bar */}
        <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={`Search ${type} categories...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 transition-all placeholder:text-zinc-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {type === "sub" && (
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className={cn(
                  "h-11 px-4 border-zinc-200 rounded-xl gap-2 text-sm font-medium transition-all shadow-sm whitespace-nowrap",
                  showFilters ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800" : "bg-white text-zinc-600 hover:bg-zinc-50"
                )}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Filters"}
              </Button>
            )}
            {selectedParent !== "All" && (
              <Button
                onClick={() => setSelectedParent("All")}
                variant="destructive"
                className="h-11 w-11 p-0 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-150"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filtering Control */}
        {showFilters && type === "sub" && (
          <div className="px-5 pb-5 pt-1 flex flex-wrap gap-4 border-b border-zinc-100 bg-zinc-50/15">
            <div className="flex flex-col gap-1.5 min-w-[240px]">
              <Label className="text-xs font-medium text-zinc-500 ml-0.5">Parent Category</Label>
              <Select value={selectedParent} onValueChange={(val) => setSelectedParent(val || "All")}>
                <SelectTrigger className="h-10 border-zinc-200 bg-white rounded-xl text-sm focus:ring-teal-600">
                  <SelectValue placeholder="All Parent Departments" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                  <SelectItem value="All" className="text-xs">All Parent Departments</SelectItem>
                  {allCategories.filter(c => !c.parent_id).map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Ingestion Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-28 pl-8">Image</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category Info</th>
                {type === "sub" && <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parent</th>}
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">URL Slug</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="w-14 pr-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-zinc-50/40 transition-all group">
                  <td className="px-6 py-4 pl-8">
                    <div className="w-12 h-12 bg-zinc-100 border border-zinc-200/60 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                      {category.image_url ? (
                        <Image src={category.image_url} alt="" width={48} height={48} unoptimized className="w-full h-full object-contain mix-blend-multiply" />
                      ) : (
                        <FolderTree className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-zinc-700 block">{category.name}</span>
                      <span className="text-xs text-zinc-400 block line-clamp-1">{category.description || "No description provided"}</span>
                    </div>
                  </td>
                  {type === "sub" && (
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg inline-block">
                        {allCategories.find(c => c.id === category.parent_id)?.name || "Unknown"}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded-lg inline-block font-mono">
                      /{category.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleStatus(category)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 hover:opacity-80",
                          category.is_active ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        )}
                      >
                        {category.is_active && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
                        {category.is_active ? "Active" : "Archived"}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right pr-8 relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === category.id ? null : category.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-all ml-auto border border-zinc-200 bg-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeDropdown === category.id && (
                      <div className="absolute right-6 top-12 w-52 bg-white border border-zinc-200 shadow-lg rounded-xl z-50 p-1.5 text-left">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">Category Actions</div>
                        <button
                          onClick={() => handleOpenDrawer(category)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-all rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-zinc-400" /> Edit Category
                        </button>
                        <div className="h-px bg-zinc-100 my-1 mx-1" />
                        <button
                          onClick={() => {
                            setCategoryToDelete(category);
                            setActiveDropdown(null);
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" /> Delete Category
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Edge State Fallback Empty View */}
        {filteredCategories.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
            <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
              <FolderTree className="w-8 h-8 text-zinc-300" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-bold text-zinc-800">No {type} Categories Found</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Adjust your filtration schema metric parameter or construct a new configuration log.</p>
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Slider Sheet Overlay Panel */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">Category Details</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Configure parameters blueprint and layout meta specifications details.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Category Image Media Engine */}
            <div className="flex justify-center pb-4 border-b border-zinc-100">
              <SingleImageUpload
                label="Category Image"
                value={formData.image_url}
                onChange={(url: string) => setFormData({ ...formData, image_url: url })}
                bucket="category-icons"
              />
            </div>

            {/* Title Identity */}
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-xs font-medium text-zinc-500">Category Name</Label>
              <Input
                id="cat-name"
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  handleNameChange(e.target.value);
                }}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                placeholder="e.g. Electrical Tools"
                required
              />
            </div>

            {/* URL Identifier Slug */}
            <div className="space-y-2">
              <Label htmlFor="cat-slug" className="text-xs font-medium text-zinc-500">URL Slug Label</Label>
              <Input
                id="cat-slug"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400 font-mono"
                placeholder="electrical-tools"
                required
              />
            </div>

            {/* Parent Dropdown (Sub-categories view execution context only) */}
            {type === "sub" && (
              <div className="space-y-2">
                <Label htmlFor="parent-selector" className="text-xs font-medium text-zinc-500">Parent Directory Scope</Label>
                <Select
                  value={formData.parent_id || undefined}
                  onValueChange={val => setFormData({ ...formData, parent_id: val || null })}
                >
                  <SelectTrigger id="parent-selector" className="h-11 border-zinc-200 bg-white rounded-xl text-sm focus:ring-teal-600">
                    <SelectValue placeholder="Select Parent Structural Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-zinc-200 rounded-xl z-[600]">
                    {allCategories.filter(c => !c.parent_id).map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Narrative Descriptive Block */}
            <div className="space-y-2">
              <Label htmlFor="cat-desc" className="text-xs font-medium text-zinc-500">Description Summary Text</Label>
              <Textarea
                id="cat-desc"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[100px] border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400 resize-none"
                placeholder="Describe this category context pipeline..."
              />
            </div>

            {/* Display Priority Order */}
            <div className="space-y-2">
              <Label htmlFor="cat-order" className="text-xs font-medium text-zinc-500">Display Priority Order</Label>
              <Input
                id="cat-order"
                type="number"
                value={formData.display_order}
                onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600"
              />
            </div>

            {/* State Active Toggle Context Card */}
            <div className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="cat-status" className="text-sm font-medium text-zinc-800">Active Routing State</Label>
                <p className="text-xs text-zinc-400">Determine status availability thresholds live inside clients viewports</p>
              </div>
              <Switch
                id="cat-status"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                className="data-[state=checked]:bg-teal-600"
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
              Save Category Parameters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Global Context Dropdown Dismiss Screen Overlay */}
      {activeDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
      )}

      {/* Delete Confirmation Modal Execution */}
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl text-zinc-900 z-[700]">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Category Record</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
              Are you sure you want to drop <span className="font-semibold text-zinc-700">{categoryToDelete?.name}</span>? This structural instruction is destructive and may break cascading foreign keys mapped onto existing products.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              variant="destructive"
              className="h-10 rounded-xl gap-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dropping Row...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}