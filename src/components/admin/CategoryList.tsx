"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Pagination } from "@/components/ui/pagination";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryListProps {
  type: "main" | "sub";
}

export default function CategoryList({ type }: CategoryListProps) {
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParent, setSelectedParent] = useState("All");
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [isCustomTax, setIsCustomTax] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [tableCategories, setTableCategories] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
    display_order: 0,
    parent_id: null as string | null,
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 0,
    hsn_code: ""
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchAllCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, status, cgst_rate, sgst_rate, igst_rate, hsn_code")
        .order("display_order", { ascending: true });

      if (error) throw error;

      const mappedData = (data || []).map((c: any) => ({
        ...c,
        is_active: c.status === true
      }));

      setAllCategories(mappedData);
    } catch (error) {
      console.error("Error fetching all categories:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchTableCategories = useCallback(async () => {
    setTableLoading(true);
    try {
      let q = supabase
        .from("categories")
        .select("*, parent:parent_id(name)", { count: "exact" });

      if (type === "main") {
        q = q.is("parent_id", null);
      } else {
        q = q.not("parent_id", "is", null);
      }

      if (debouncedSearchQuery) {
        q = q.or(`name.ilike.%${debouncedSearchQuery}%,slug.ilike.%${debouncedSearchQuery}%`);
      }

      if (type === "sub" && selectedParent !== "All") {
        q = q.eq("parent_id", selectedParent);
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("display_order", { ascending: true })
        .range(start, end);

      if (error) throw error;

      const mappedData = (data || []).map((c: any) => ({
        ...c,
        is_active: c.status === true
      }));

      setTableCategories(mappedData);
      setTotalItems(count || 0);
    } catch (error) {
      console.error("Error fetching table categories:", error);
      toast.error("Failed to load categories table");
    } finally {
      setTableLoading(false);
    }
  }, [supabase, type, currentPage, pageSize, debouncedSearchQuery, selectedParent]);

  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  useEffect(() => {
    fetchTableCategories();
  }, [fetchTableCategories]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedParent]);

  const typeCategories = useMemo(() => {
    if (type === "main") {
      return allCategories.filter((c: any) => !c.parent_id);
    } else {
      return allCategories.filter((c: any) => c.parent_id);
    }
  }, [allCategories, type]);

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
        parent_id: category.parent_id,
        cgst_rate: category.cgst_rate || 0,
        sgst_rate: category.sgst_rate || 0,
        igst_rate: category.igst_rate || 0,
        hsn_code: category.hsn_code || ""
      });
      setIsCustomTax(![0, 3, 5, 12, 18, 28].includes(category.igst_rate || 0));
    } else {
      setEditingCategory(null);
      const defaultParent = type === "main" ? null : (allCategories.find(c => !c.parent_id)?.id || null);
      const parentCat = allCategories.find(c => c.id === defaultParent);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        is_active: true,
        display_order: 0,
        parent_id: defaultParent,
        cgst_rate: parentCat ? parentCat.cgst_rate : 0,
        sgst_rate: parentCat ? parentCat.sgst_rate : 0,
        igst_rate: parentCat ? parentCat.igst_rate : 0,
        hsn_code: parentCat ? (parentCat.hsn_code || "") : ""
      });
      setIsCustomTax(![0, 3, 5, 12, 18, 28].includes(parentCat ? parentCat.igst_rate : 0));
    }
    setIsDrawerOpen(true);
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

        // Cascade tax_rate update to subcategories and their products if editing a main category
        if (type === "main" || !editingCategory.parent_id) {
          const cascadeData = {
            cgst_rate: submitData.cgst_rate,
            sgst_rate: submitData.sgst_rate,
            igst_rate: submitData.igst_rate,
            hsn_code: submitData.hsn_code
          };
          const { error: subError } = await supabase
            .from("categories")
            .update(cascadeData)
            .eq("parent_id", editingCategory.id);
          if (subError) throw subError;

          // Update products directly under the main category
          await supabase.from("products").update({
            cgst_rate: submitData.cgst_rate,
            sgst_rate: submitData.sgst_rate,
            igst_rate: submitData.igst_rate,
            is_tax_inclusive: submitData.igst_rate > 0
          }).eq("category_id", editingCategory.id);
          
          // And products under subcategories
          const { data: subCats } = await supabase.from("categories").select("id").eq("parent_id", editingCategory.id);
          if (subCats && subCats.length > 0) {
            const subCatIds = subCats.map((c: any) => c.id);
            await supabase.from("products").update({
              cgst_rate: submitData.cgst_rate,
              sgst_rate: submitData.sgst_rate,
              igst_rate: submitData.igst_rate,
              is_tax_inclusive: submitData.igst_rate > 0
            }).in("category_id", subCatIds);
          }
        }

        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase.from("categories").insert([submitData]);
        if (error) throw error;
        toast.success("Category created successfully");
      }
      setIsDrawerOpen(false);
      fetchAllCategories();
      fetchTableCategories();
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
      toast.success("Category successfully removed");
      setCategoryToDelete(null);
      fetchAllCategories();
      fetchTableCategories();
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

      setTableCategories(prev => prev.map(c =>
        c.id === category.id ? { ...c, is_active: result.newStatus, status: result.newStatus } : c
      ));
      setAllCategories(prev => prev.map(c =>
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
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
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
            { title: "Total Groups", value: typeCategories.length, label: "Registered listings" },
            { title: "Active Status", value: typeCategories.filter(c => c.is_active).length, label: "Live in storefront" },
            { title: "Archived", value: typeCategories.filter(c => !c.is_active).length, label: "Hidden items" },
            { title: "Max Order", value: typeCategories.length > 0 ? Math.max(...typeCategories.map(c => c.display_order || 0)) : 0, label: "Layout priority max" }
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
        <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row gap-3 items-center">
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
          <div className="px-5 pb-5 pt-1 flex flex-wrap gap-4 border-b border-zinc-100 bg-zinc-50">
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
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-28 pl-8">Image</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category Info</th>
                {type === "sub" && <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parent</th>}
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">URL Slug</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">HSN Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">IGST Rate</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="w-14 pr-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={type === "sub" ? 8 : 7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      <p className="text-xs font-semibold">Loading categories...</p>
                    </div>
                  </td>
                </tr>
              ) : tableCategories.length === 0 ? (
                <tr>
                  <td colSpan={type === "sub" ? 8 : 7} className="p-16 text-center text-zinc-500 bg-white">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100 text-zinc-300">
                        <FolderTree className="w-8 h-8" />
                      </div>
                      <div className="max-w-xs">
                        <h3 className="text-sm font-bold text-zinc-800">No {type} Categories Found</h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Adjust your filtration schema or add a new category to get started.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                tableCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-zinc-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 pl-8">
                      <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0 shadow-sm">
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
                          {category.parent?.name || allCategories.find(c => c.id === category.parent_id)?.name || "Unknown"}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded-lg inline-block font-mono">
                        /{category.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-150 px-2.5 py-1 rounded-lg inline-block font-mono">
                        {category.hsn_code || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-150 px-2.5 py-1 rounded-lg inline-block font-mono">
                        {category.igst_rate !== null && category.igst_rate !== undefined ? `${category.igst_rate}%` : "0%"}
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
                    <td className="px-6 py-4 text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="w-8 h-8 p-0 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg ml-auto border border-zinc-200 bg-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-zinc-200 shadow-xl rounded-xl p-1.5 z-50">
                          <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1">Category Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenDrawer(category)}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950 transition-all font-semibold"
                          >
                            <Edit className="w-4 h-4 text-zinc-400" /> Edit Category
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setCategoryToDelete(category)}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:text-red-750 focus:bg-red-50 transition-all font-semibold"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" /> Delete Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!tableLoading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            variantColor="purple"
          />
        )}
      </Card>

      {/* Configuration Slider Sheet Overlay Panel */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-[640px] bg-white border-l border-zinc-200 p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <SheetHeader className="p-6 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200">
                <FolderTree className="w-5 h-5 text-zinc-700" />
              </div>

              <div>
                <SheetTitle className="text-lg font-bold text-zinc-900">
                  {editingCategory ? "Update Category" : "Add New Category"}
                </SheetTitle>

                <SheetDescription className="text-xs text-zinc-500 mt-1">
                  {isMain ? "Main Department Setup" : "Sub-department Setup"} • Configure category settings
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50"
          >

            {/* Image Upload */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <div className="flex flex-col items-center">
                <SingleImageUpload
                  label="Category Icon / Image"
                  value={formData.image_url}
                  onChange={(url: string) =>
                    setFormData({ ...formData, image_url: url })
                  }
                  bucket="category-icons"
                />

                <span className="text-xs text-zinc-500 mt-3">
                  Category Image
                </span>
              </div>
            </div>

            {/* Department Identity */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl space-y-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-3 flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Department Identity
              </h3>

              {/* Category Name */}
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name</Label>

                <Input
                  id="cat-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-11"
                  placeholder="Electrical Tools"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="cat-slug">URL Slug</Label>

                <Input
                  id="cat-slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  className="h-11"
                  placeholder="electrical-tools"
                  required
                />
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl space-y-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings & Taxation
              </h3>

              {/* HSN Code */}
              <div className="space-y-2">
                <Label>HSN Code</Label>
                {type === "sub" ? (
                  <div className="flex items-center gap-2 h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                    <span className="text-sm font-semibold">{formData.hsn_code || "N/A"} (Inherited)</span>
                  </div>
                ) : (
                  <Input
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="h-11"
                    placeholder="e.g. 8544"
                  />
                )}
              </div>

              {/* GST */}
              <div className="space-y-4">
                <Label>GST Configuration</Label>

                {type === "sub" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">IGST</span>
                      <div className="flex items-center h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                        <span className="text-sm font-semibold">{formData.igst_rate}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">CGST</span>
                      <div className="flex items-center h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                        <span className="text-sm font-semibold">{formData.cgst_rate}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">SGST</span>
                      <div className="flex items-center h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                        <span className="text-sm font-semibold">{formData.sgst_rate}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">IGST Rate (%)</span>
                      <Select
                        value={isCustomTax ? "custom" : formData.igst_rate.toString()}
                        onValueChange={(val) => {
                          if (val === "custom") {
                            setIsCustomTax(true);
                          } else {
                            setIsCustomTax(false);
                            const igst = parseFloat(val || "0");
                            setFormData({
                              ...formData,
                              igst_rate: igst,
                              cgst_rate: igst / 2,
                              sgst_rate: igst / 2
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="IGST" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="3">3%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                          <SelectItem value="custom">Custom Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">CGST Rate (%)</span>
                      <div className="flex items-center h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                        <span className="text-sm font-semibold">{formData.cgst_rate}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500">SGST Rate (%)</span>
                      <div className="flex items-center h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 select-none cursor-not-allowed">
                        <span className="text-sm font-semibold">{formData.sgst_rate}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Order */}
              <div className="space-y-2">
                <Label>Display Priority</Label>

                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-11"
                />
              </div>

              {/* Status */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4",
                  formData.is_active
                    ? "bg-white border-emerald-200"
                    : "bg-white border-zinc-200"
                )}
              >
                <div>
                  <h4 className="font-medium text-zinc-900">
                    Category Status
                  </h4>

                  <p className="text-xs text-zinc-500">
                    {formData.is_active
                      ? "Visible on storefront"
                      : "Hidden from storefront"}
                  </p>
                </div>

                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_active: checked,
                    })
                  }
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
              <div className="space-y-2">
                <Label>Description</Label>

                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className="min-h-[120px]"
                  placeholder="Category description..."
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-200 bg-white shrink-0">
            <Button
              disabled={saving}
              onClick={handleSubmit}
              className={cn(
                "w-full h-11 rounded-xl font-semibold text-white",
                isMain
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-violet-600 hover:bg-violet-700"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingCategory
                    ? "Save Changes"
                    : "Create Category"}
                </>
              )}
            </Button>
          </div>


        </SheetContent>
      </Sheet>




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