"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  FolderHeart,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQStats {
  total: number;
  published: number;
  draft: number;
  categories: number;
  allCategories: string[];
}

export default function FAQAdminPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data State
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [stats, setStats] = useState<FAQStats>({
    total: 0,
    published: 0,
    draft: 0,
    categories: 0,
    allCategories: [],
  });

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQItem | null>(null);
  const [faqToEdit, setFaqToEdit] = useState<FAQItem | null>(null);
  
  // Form Fields
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Debounce Search Query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, categoryFilter, statusFilter]);

  // Load KPI Stats & Category List
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("category, is_published");

      if (error) throw error;

      if (data) {
        const total = data.length;
        const published = data.filter((f) => f.is_published).length;
        const draft = total - published;
        const cats = Array.from(new Set(data.map((f) => f.category).filter(Boolean)));
        
        setStats({
          total,
          published,
          draft,
          categories: cats.length,
          allCategories: cats,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [supabase]);

  // Load FAQs list for table
  const fetchTableFaqs = useCallback(async () => {
    setTableLoading(true);
    try {
      let q = supabase
        .from("faqs")
        .select("*", { count: "exact" });

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.trim();
        q = q.or(`question.ilike.%${query}%,answer.ilike.%${query}%`);
      }

      if (categoryFilter !== "all") {
        q = q.eq("category", categoryFilter);
      }

      if (statusFilter !== "all") {
        q = q.eq("is_published", statusFilter === "published");
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setFaqs((data as FAQItem[]) || []);
      setTotalItems(count || 0);
    } catch (err) {
      console.error("Error fetching FAQs table:", err);
      toast.error("Failed to load FAQs list");
    } finally {
      setTableLoading(false);
    }
  }, [supabase, currentPage, pageSize, debouncedSearchQuery, categoryFilter, statusFilter]);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTableFaqs()]);
    setLoading(false);
  }, [fetchStats, fetchTableFaqs]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleRefresh = async () => {
    const toastId = toast.loading("Refreshing FAQs...");
    await Promise.all([fetchStats(), fetchTableFaqs()]);
    toast.success("FAQs refreshed", { id: toastId });
  };

  const openCreateDialog = () => {
    setFaqToEdit(null);
    setQuestion("");
    setAnswer("");
    setCategory(stats.allCategories[0] || "General");
    setSortOrder((faqs[faqs.length - 1]?.sort_order || 0) + 10);
    setIsPublished(true);
    setIsFormOpen(true);
  };

  const openEditDialog = (faq: FAQItem) => {
    setFaqToEdit(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    setSortOrder(faq.sort_order);
    setIsPublished(faq.is_published);
    setIsFormOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return toast.error("Please enter a question");
    if (!answer.trim()) return toast.error("Please enter an answer");
    if (!category.trim()) return toast.error("Please specify a category");

    setSaving(true);
    try {
      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim(),
        sort_order: sortOrder,
        is_published: isPublished,
        updated_at: new Date().toISOString()
      };

      if (faqToEdit) {
        // Update
        const { error } = await supabase
          .from("faqs")
          .update(payload)
          .eq("id", faqToEdit.id);

        if (error) throw error;
        toast.success("FAQ updated successfully");
      } else {
        // Create
        const { error } = await supabase
          .from("faqs")
          .insert([payload]);

        if (error) throw error;
        toast.success("FAQ created successfully");
      }

      setIsFormOpen(false);
      await Promise.all([fetchStats(), fetchTableFaqs()]);
    } catch (err: any) {
      console.error("Error saving FAQ:", err);
      toast.error(err.message || "Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("faqs")
        .delete()
        .eq("id", faqToDelete.id);

      if (error) throw error;

      toast.success("FAQ deleted successfully");
      setIsConfirmOpen(false);
      setFaqToDelete(null);
      await Promise.all([fetchStats(), fetchTableFaqs()]);
    } catch (err: any) {
      console.error("Error deleting FAQ:", err);
      toast.error(err.message || "Failed to delete FAQ");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickSortOrderChange = async (faq: FAQItem, increment: number) => {
    const newOrder = faq.sort_order + increment;
    try {
      const { error } = await supabase
        .from("faqs")
        .update({ sort_order: newOrder, updated_at: new Date().toISOString() })
        .eq("id", faq.id);
      
      if (error) throw error;
      
      // Update local state temporarily for snappy UI response
      setFaqs(prev => 
        prev.map(f => f.id === faq.id ? { ...f, sort_order: newOrder } : f)
            .sort((a, b) => a.sort_order - b.sort_order)
      );
      
      toast.success(`Sort order updated to ${newOrder}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update sort order");
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery !== "" || categoryFilter !== "all" || statusFilter !== "all";
  }, [searchQuery, categoryFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  if (loading && stats.total === 0) return <LogoLoader text="Loading FAQs ledger..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 relative">
      {/* Premium Cyan/Teal Gradient Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header System */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">FAQ Management</h1>
            <p className="text-sm font-medium text-cyan-100 mt-1">
              Organize, edit, and publish Frequently Asked Questions for customer self-service.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              className="h-11 px-4 bg-white/10 hover:bg-white/25 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", tableLoading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={openCreateDialog}
              className="h-11 px-5 bg-white text-cyan-700 hover:bg-cyan-50 font-bold text-sm rounded-xl transition-all border-0 shadow-md gap-2"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </Button>
          </div>
        </div>

        {/* KPI Stats cards */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-wider">Total Qs</span>
              <HelpCircle className="w-4 h-4 text-cyan-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-wider">Published</span>
              <Eye className="w-4 h-4 text-emerald-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {stats.published}
                {stats.total > 0 && (
                  <span className="text-xs text-emerald-200 font-bold">
                    ({Math.round((stats.published / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-wider">Drafts</span>
              <EyeOff className="w-4 h-4 text-amber-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white">{stats.draft}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-wider">Categories</span>
              <FolderHeart className="w-4 h-4 text-cyan-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white">{stats.categories}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQs Ledger */}
      <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by keywords inside questions or answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-80 shrink-0 flex gap-2">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
              <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm w-full">
                <SelectValue placeholder="Category Filter" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {stats.allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="h-11 px-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-550 shrink-0"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8 w-[50px] text-center">Order</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[260px]">Question</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Answer Preview</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[160px]">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[120px]">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right pr-8 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                      <p className="text-xs font-semibold">Loading FAQs...</p>
                    </div>
                  </td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-500 font-medium">
                    No FAQs match your search filters.
                  </td>
                </tr>
              ) : (
                faqs.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-all duration-200 align-top">
                    <td className="px-6 py-4 pl-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg p-1 w-10">
                        <button
                          onClick={() => handleQuickSortOrderChange(item, -5)}
                          className="text-zinc-400 hover:text-cyan-600 p-0.5"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-zinc-700">{item.sort_order}</span>
                        <button
                          onClick={() => handleQuickSortOrderChange(item, 5)}
                          className="text-zinc-400 hover:text-cyan-600 p-0.5"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-800 text-sm leading-snug">
                        {item.question}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium mt-1">
                        Updated: {new Date(item.updated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-300">
                        {item.answer}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-100">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          <Eye className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          className="h-9 w-9 rounded-lg hover:bg-cyan-50 text-zinc-400 hover:text-cyan-600 transition-all border border-transparent hover:border-cyan-100"
                          title="Edit FAQ"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFaqToDelete(item);
                            setIsConfirmOpen(true);
                          }}
                          className="h-9 w-9 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
            variantColor="teal"
          />
        )}
      </Card>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-lg p-6 z-50 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-zinc-950 font-bold text-lg">
              {faqToEdit ? "Edit Frequently Asked Question" : "Add FAQ Entry"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1.5">
              Fill in the fields below to create or update an FAQ record. The category helps organize questions in groups.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFaq} className="space-y-4 mt-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="faq-question" className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">Question</label>
              <Input
                id="faq-question"
                placeholder="e.g. How can I request a Certificate of Analysis?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-white border-zinc-200 text-sm focus-visible:ring-cyan-500 rounded-xl"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="faq-answer" className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">Answer Details</label>
              <textarea
                id="faq-answer"
                placeholder="Describe the answer completely..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                className="flex w-full rounded-xl border border-zinc-205 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">Category</label>
                <div className="space-y-2">
                  <Select value={category} onValueChange={(val) => setCategory(val || "General")}>
                    <SelectTrigger className="border-zinc-200 rounded-xl text-sm w-full bg-white h-10">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-zinc-200 rounded-xl z-[60]">
                      <SelectItem value="Ordering">Ordering</SelectItem>
                      <SelectItem value="Shipping">Shipping</SelectItem>
                      <SelectItem value="Quotes">Quotes</SelectItem>
                      <SelectItem value="Products">Products</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or type custom category name..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-white border-zinc-200 text-xs focus-visible:ring-cyan-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="faq-sort" className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">Sort Order</label>
                <Input
                  id="faq-sort"
                  type="number"
                  placeholder="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="bg-white border-zinc-200 text-sm focus-visible:ring-cyan-500 rounded-xl"
                />
                <span className="text-[10px] text-zinc-400 block leading-normal mt-0.5">Determines the priority order (lower order value = higher position).</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="faq-published"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="faq-published" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                Publish FAQ Immediately (Visible on Customer Site)
              </label>
            </div>

            <DialogFooter className="mt-6 pt-2 border-t border-zinc-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={saving}
                className="rounded-xl border-zinc-200 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl gap-2 flex items-center justify-center border-0 text-sm h-10 px-4 font-bold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save FAQ</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6 z-50">
          <DialogHeader>
            <DialogTitle className="text-zinc-950 font-bold text-lg">Delete FAQ Entry</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm mt-3">
              Are you sure you want to permanently delete this FAQ: <span className="font-bold text-zinc-900">"{faqToDelete?.question}"</span>? 
              This will remove the question from the database and storefront. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setFaqToDelete(null);
              }}
              disabled={deleting}
              className="rounded-xl border-zinc-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 flex items-center justify-center border-0"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete FAQ</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
