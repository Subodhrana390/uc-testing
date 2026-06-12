"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  GroupingState,
  ExpandedState,
  getGroupedRowModel,
  getExpandedRowModel,
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  Loader2,
  Layers,
  Activity,
  Globe,
  Settings,
  Award,
  Image as ImageIcon,
  Star,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
import LogoLoader from "@/components/ui/LogoLoader";
import { toggleBrandStatus, toggleBrandFeatured } from "@/app/actions/admin";
import { Pagination } from "@/components/ui/pagination";

// Recharts imports
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("analytics");
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandToDelete, setBrandToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    status: true,
    logo_url: "",
    is_featured: false
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, status")
        .order("name", { ascending: true });

      if (error) throw error;
      const mainCats = (data || []).filter((c: any) => !c.parent_id && c.status === true);
      setCategories(mainCats);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchBrands();
    fetchCategories();
  }, [supabase]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    brands.forEach(b => {
      const catName = b.category || "Unassigned";
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [brands]);

  const statusChartData = useMemo(() => {
    const active = brands.filter(b => b.status === true).length;
    const inactive = brands.filter(b => b.status === false).length;
    return [
      { name: "Active", value: active, color: "#3b82f6" },
      { name: "Inactive", value: inactive, color: "#64748b" }
    ];
  }, [brands]);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Brand Name",
      cell: (info) => {
        const brand = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
              {brand.logo_url ? (
                <Image src={brand.logo_url} alt="" width={40} height={40} className="w-full h-full object-contain" />
              ) : (
                <Award className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-700">{brand.name}</span>
              {!!brand.is_featured && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 border border-amber-100 text-amber-500">
                  <Star className="w-3 h-3 fill-current" />
                </span>
              )}
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => (
        <span className="text-xs font-medium text-zinc-500 block">{info.getValue() || "—"}</span>
      )
    }),
    columnHelper.accessor("status", {
      header: "Status",
      enableSorting: false,
      cell: (info) => {
        const brand = info.row.original;
        return (
          <button
            onClick={() => handleToggleStatus(brand)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold text-white inline-flex items-center gap-2 shadow-sm transition-all hover:opacity-90",
              brand.status === true ? "bg-blue-600" : "bg-zinc-500"
            )}
          >
            {brand.status === true ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Active
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                Inactive
              </>
            )}
          </button>
        );
      }
    }),
    columnHelper.accessor("is_featured", {
      header: "Featured",
      enableSorting: false,
      cell: (info) => {
        const brand = info.row.original;
        return (
          <button
            onClick={() => handleToggleFeatured(brand)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all hover:opacity-90",
              brand.is_featured ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500 border border-zinc-200"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", brand.is_featured ? "fill-current" : "")} />
            {brand.is_featured ? "Featured" : "Standard"}
          </button>
        );
      }
    }),
    columnHelper.display({
      id: "actions",
      enableSorting: false,
      cell: (info) => {
        const brand = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleOpenDrawer(brand)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-all"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBrandToDelete(brand)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    })
  ], []);

  const table = useReactTable({
    data: brands,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
      pagination,
      grouping,
      expanded,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const name = String(row.getValue("name") || "").toLowerCase();
      const category = String(row.getValue("category") || "").toLowerCase();
      const search = String(filterValue).toLowerCase();
      return name.includes(search) || category.includes(search);
    },
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery]);

  const handleOpenDrawer = (brand?: any) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        name: brand.name,
        category: brand.category || "",
        status: brand.status ?? true,
        logo_url: brand.logo_url || "",
        is_featured: !!brand.is_featured
      });
    } else {
      setEditingBrand(null);
      setFormData({
        name: "",
        category: "",
        status: true,
        logo_url: "",
        is_featured: false
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Brand name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingBrand) {
        const { error } = await supabase
          .from("brands")
          .update(formData)
          .eq("id", editingBrand.id);
        if (error) throw error;
        toast.success("Brand updated successfully");
      } else {
        const { error } = await supabase
          .from("brands")
          .insert([formData]);
        if (error) throw error;
        toast.success("Brand created successfully");
      }
      setIsDrawerOpen(false);
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("brands").delete().eq("id", brandToDelete.id);
      if (error) throw error;
      setBrands(prev => prev.filter((b) => b.id !== brandToDelete.id));
      toast.success("Brand entry successfully deleted");
      setBrandToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (brand: any) => {
    const toastId = toast.loading("Updating brand status...");
    try {
      const result = await toggleBrandStatus(brand.id, brand.status);

      if (!result.success) {
        throw new Error(result.error);
      }

      setBrands(prev => prev.map(b =>
        b.id === brand.id ? { ...b, status: result.newStatus } : b
      ));
      toast.success(`Brand is now ${result.newStatus ? "Active" : "Inactive"}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Failed to update status", { id: toastId });
    }
  };

  const handleToggleFeatured = async (brand: any) => {
    const toastId = toast.loading("Updating featured status...");
    try {
      const result = await toggleBrandFeatured(brand.id, !!brand.is_featured);

      if (!result.success) {
        throw new Error(result.error);
      }

      setBrands(prev => prev.map(b =>
        b.id === brand.id ? { ...b, is_featured: result.newFeatured } : b
      ));
      toast.success(`Brand is ${result.newFeatured ? "now" : "no longer"} featured`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Failed to update featured status", { id: toastId });
    }
  };

  if (loading) return <LogoLoader text="Loading brand directory..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      {/* Redesigned Header UI Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden mb-6 transition-all duration-300">
        {/* Subtle colorful neon glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-sky-500/10 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Viewport Container */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-bold text-slate-300 tracking-tight border-none p-0 !pl-0 before:hidden">
                  Brand Directory
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/5 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {brands.length} Partners
                </span>
              </div>
              <p className="text-sm font-medium text-slate-300 mt-1">
                Configure authorized industrial creators and localize partner visibility
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDrawer()}
            className="h-11 px-5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] border-0 gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Initialize Brand
          </Button>
        </div>
      </div>

      {/* Unified Tab Workspace System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-2">
          <TabsList className="bg-zinc-100/80 p-1 rounded-xl h-11 flex w-fit">
            <TabsTrigger value="analytics" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm gap-1.5 flex items-center">
              <Activity className="w-3.5 h-3.5 text-zinc-500" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="table" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm">
              Brands Table
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Brands Table */}
        <TabsContent value="table" className="space-y-4 outline-none">
          {/* Main Table Interface */}
          <Card className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden py-0 gap-0">
            {/* Filtration Header */}
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search brands by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
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
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-4 h-11 rounded-xl shadow-sm select-none shrink-0">
                <Label htmlFor="group-by-category" className="text-xs font-semibold text-zinc-650 cursor-pointer">
                  Group by Category
                </Label>
                <Switch
                  id="group-by-category"
                  checked={grouping.includes("category")}
                  onCheckedChange={(checked) => {
                    setGrouping(checked ? ["category"] : []);
                  }}
                  className="data-[state=checked]:bg-blue-600 bg-black"
                />
              </div>
            </div>        {/* Tabular Ingestion Stream */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-zinc-50/70 border-b border-zinc-100">
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider select-none",
                            header.column.getCanSort() && "cursor-pointer hover:bg-zinc-100 hover:text-zinc-600 transition-colors",
                            header.id === "name" && "pl-8",
                            header.id === "actions" && "w-24 pr-8 text-right"
                          )}
                        >
                          <div className="flex items-center gap-1.5 justify-start">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            {header.column.getIsSorted() === "asc" && (
                              <span className="text-[10px]">▲</span>
                            )}
                            {header.column.getIsSorted() === "desc" && (
                              <span className="text-[10px]">▼</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 even:bg-zinc-50/20 transition-all duration-200 hover:translate-x-0.5 hover:shadow-sm group">
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-6 py-4",
                            cell.column.id === "name" && "pl-8",
                            cell.column.id === "actions" && "text-right pr-8"
                          )}
                        >
                          {cell.getIsGrouped() ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className="flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 focus:outline-none"
                            >
                              <span>{row.getIsExpanded() ? "▼" : "▶"}</span>
                              <span>{String(cell.getValue() || "Unassigned")}</span>
                              <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                                {row.subRows.length} {row.subRows.length === 1 ? "brand" : "brands"}
                              </span>
                            </button>
                          ) : cell.getIsAggregated() ? (
                            null
                          ) : cell.getIsPlaceholder() ? (
                            null
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getFilteredRowModel().rows.length > 0 && (
              <Pagination
                currentPage={table.getState().pagination.pageIndex + 1}
                totalItems={table.getFilteredRowModel().rows.length}
                pageSize={table.getState().pagination.pageSize}
                onPageChange={(page) => table.setPageIndex(page - 1)}
                onPageSizeChange={(size) => table.setPageSize(size)}
                variantColor="blue"
              />
            )}

            {/* Empty Fallback State */}
            {table.getFilteredRowModel().rows.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
                <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center rounded-2xl border border-zinc-100">
                  <Layers className="w-8 h-8 text-zinc-300" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-sm font-bold text-[#18181b]">No Brands Found</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">We couldn't find any industrial partners matching your search query.</p>
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
        </TabsContent>

        {/* Tab 2: Analytics */}
        <TabsContent value="analytics" className="space-y-6 outline-none animate-in fade-in-50 duration-200">
          {/* Analytics Summary Core Matrix */}
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Partners</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Layers className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black tracking-tight text-zinc-800">{brands.length}</div>
                <p className="text-[11px] text-zinc-400 mt-1">Industrial creators</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Brands</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Activity className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black tracking-tight text-zinc-800">
                  {brands.filter(b => b.status === true).length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Live storefront listings</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Categories</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Globe className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black tracking-tight text-zinc-800">
                  {new Set(brands.map(b => b.category).filter(Boolean)).size}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Unique segments</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-150 shadow-sm rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Featured Brands</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                  <Star className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-black tracking-tight text-zinc-800">
                  {brands.filter(b => !!b.is_featured).length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Promoted spotlight listings</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Distribution Chart */}
            <Card className="lg:col-span-2 bg-white border border-zinc-100 shadow-sm rounded-2xl p-6 flex flex-col justify-between text-[#18181b]">
              <div>
                <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Top Categories</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-1">Brand count by categories (Top 5)</p>
              </div>
              <div className="h-[240px] w-full mt-4 -ml-4">
                {isMounted && brands.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="brandCategoryBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} width={90} />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-blue-500 text-xs font-bold animate-in fade-in duration-200">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                  {payload[0].payload.name}
                                </p>
                                <p className="text-sm font-black">
                                  {payload[0].value} brands
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="url(#brandCategoryBarGrad)" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">No brand data available</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Status Distribution Donut Chart */}
            <Card className="lg:col-span-1 bg-white border border-zinc-100 shadow-sm rounded-2xl p-6 flex flex-col justify-between text-[#18181b]">
              <div>
                <h3 className="text-lg font-bold text-[#18181b] tracking-tight">Active Status</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-1">Listing distribution</p>
              </div>
              <div className="h-[240px] w-full mt-4 flex items-center justify-center relative">
                {isMounted && brands.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = ((data.value / (brands.length || 1)) * 100).toFixed(1);
                            return (
                              <div className="bg-zinc-950 text-white p-3 rounded-xl shadow-xl border border-zinc-800 text-xs font-bold animate-in fade-in duration-200">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                                  {data.name}
                                </p>
                                <p className="text-sm font-black">
                                  {data.value} brands ({percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">No brand data available</p>
                  </div>
                )}

                {/* Center Text inside Donut Hole */}
                {isMounted && brands.length > 0 && (
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-[#18181b]">
                      {brands.filter(b => b.status === true).length}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active</span>
                  </div>
                )}
              </div>

              {/* Custom Legends */}
              <div className="flex items-center justify-center gap-4 mt-2">
                {statusChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Configuration Sheet Panel */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white rounded-l-2xl border-l border-zinc-100 p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-6 border-b border-zinc-100 bg-zinc-50/30">
            <SheetTitle className="text-lg font-bold text-zinc-800">Brand Specification</SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 mt-0.5">
              Configure parameters and manufacturing partner properties.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Logo Media Engine */}
            <div className="flex justify-center pb-4 border-b border-zinc-100">
              <SingleImageUpload
                onChange={(url: string) => setFormData({ ...formData, logo_url: url })}
                value={formData.logo_url}
              />
            </div>

            {/* Brand Designation */}
            <div className="space-y-2">
              <Label htmlFor="brand-name" className="text-xs font-medium text-zinc-500">Brand Designation</Label>
              <Input
                id="brand-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 border-zinc-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600 placeholder:text-zinc-400"
                placeholder="e.g. BOSCH"
                required
              />
            </div>

            {/* Brand Category */}
            <div className="space-y-2">
              <Label htmlFor="brand-category" className="text-xs font-medium text-zinc-500">Brand Category</Label>
              <select
                id="brand-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-11 px-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Button State wrapper */}
            <div
              className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl"
            >
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-medium text-zinc-800">Active Listing Status</Label>
                <p className="text-xs text-zinc-400">Determine visibility across localized client platforms</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: !prev.status }))}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2",
                  formData.status ? "bg-teal-600 text-white" : "bg-zinc-200 text-zinc-600"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", formData.status ? "bg-white animate-pulse" : "bg-zinc-400")} />
                {formData.status ? "Active" : "Inactive"}
              </button>
            </div>

            {/* Featured Brand Toggle Button wrapper */}
            <div
              className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-100 rounded-xl"
            >
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-medium text-zinc-800">Featured Partner</Label>
                <p className="text-xs text-zinc-400">Promote this brand on storefront spotlights</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2",
                  formData.is_featured ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-600"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", formData.is_featured ? "fill-current" : "")} />
                {formData.is_featured ? "Featured" : "Standard"}
              </button>
            </div>
          </form>

          {/* Form Action Footer */}
          <div className="p-6 border-t border-zinc-150/40 bg-zinc-50/30">
            <Button
              disabled={saving}
              onClick={handleSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 rounded-xl text-sm font-medium transition-all shadow-sm gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Finalize Brand Entry
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!brandToDelete} onOpenChange={(open) => !open && setBrandToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border border-zinc-150 p-6 shadow-xl text-zinc-900">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg font-bold text-zinc-800">Delete Brand</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Are you sure you want to delete <span className="font-semibold text-zinc-700">{brandToDelete?.name}</span>? This action cannot be undone and may affect products linked to this brand.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setBrandToDelete(null)}
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
                  Delete Brand
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}