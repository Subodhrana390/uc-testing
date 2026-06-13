"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Star,
  Trash2,
  Search,
  X,
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import LogoLoader from "@/components/ui/LogoLoader";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

interface ReviewItem {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  review: string;
  images: string[];
  created_at: string;
  is_hidden: boolean;
  products?: {
    name: string;
  } | null;
}

interface RatingStats {
  total: number;
  average: number;
  positive: number;
  negative: number;
}

export default function ReviewsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Data State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [stats, setStats] = useState<RatingStats>({ total: 0, average: 0, positive: 0, negative: 0 });

  // Lightbox & Delete State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Debounce Search Query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, ratingFilter, visibilityFilter]);

  // Load KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("rating");
      
      if (error) throw error;

      if (data) {
        const total = data.length;
        const average = total > 0 ? data.reduce((acc, r) => acc + r.rating, 0) / total : 0;
        const positive = data.filter(r => r.rating >= 4).length;
        const negative = data.filter(r => r.rating <= 2).length;
        
        setStats({ total, average, positive, negative });
      }
    } catch (err) {
      console.error("Error fetching review stats:", err);
    }
  }, [supabase]);

  // Load Reviews for the Table
  const fetchTableReviews = useCallback(async () => {
    setTableLoading(true);
    try {
      let q;
      
      // If there is a search query, use !inner join to search on product name
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.trim();
        q = supabase
          .from("product_reviews")
          .select("*, products!inner(name)", { count: "exact" })
          .or(`reviewer_name.ilike.%${query}%,title.ilike.%${query}%,review.ilike.%${query}%,products.name.ilike.%${query}%`);
      } else {
        q = supabase
          .from("product_reviews")
          .select("*, products(name)", { count: "exact" });
      }

      if (ratingFilter !== "all") {
        q = q.eq("rating", parseInt(ratingFilter));
      }

      if (visibilityFilter === "visible") {
        q = q.eq("is_hidden", false);
      } else if (visibilityFilter === "hidden") {
        q = q.eq("is_hidden", true);
      }

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, count, error } = await q
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setReviews((data as ReviewItem[]) || []);
      setTotalItems(count || 0);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      toast.error("Failed to load reviews list");
    } finally {
      setTableLoading(false);
    }
  }, [supabase, currentPage, pageSize, debouncedSearchQuery, ratingFilter, visibilityFilter]);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTableReviews()]);
    setLoading(false);
  }, [fetchStats, fetchTableReviews]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleRefresh = async () => {
    const toastId = toast.loading("Refreshing reviews data...");
    await Promise.all([fetchStats(), fetchTableReviews()]);
    toast.success("Reviews data refreshed", { id: toastId });
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", reviewToDelete.id);

      if (error) throw error;
      
      toast.success("Review deleted successfully");
      setIsConfirmOpen(false);
      setReviewToDelete(null);
      
      // Reload table reviews & stats
      await Promise.all([fetchStats(), fetchTableReviews()]);
    } catch (err: any) {
      console.error("Error deleting review:", err);
      toast.error(err.message || "Failed to delete review");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleHidden = async (reviewId: string, currentlyHidden: boolean) => {
    setTogglingId(reviewId);
    try {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_hidden: !currentlyHidden })
        .eq("id", reviewId);

      if (error) throw error;
      toast.success(currentlyHidden ? "Review is now visible" : "Review hidden from storefront");
      await fetchTableReviews();
    } catch (err: any) {
      console.error("Error toggling review visibility:", err);
      toast.error(err.message || "Failed to update review");
    } finally {
      setTogglingId(null);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery !== "" || ratingFilter !== "all" || visibilityFilter !== "all";
  }, [searchQuery, ratingFilter, visibilityFilter]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setRatingFilter("all");
    setVisibilityFilter("all");
  };

  if (loading && stats.total === 0) return <LogoLoader text="Loading customer feedback..." />;

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 relative">
      {/* Premium Violet/Purple Gradient Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden mb-8">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

        {/* Header System */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight border-none p-0 !pl-0 before:hidden">Reviews Moderation</h1>
            <p className="text-sm font-medium text-violet-100 mt-1">
              Monitor customer feedback, analyze product rating scores, and manage review submissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              className="h-11 px-4 bg-white/10 hover:bg-white/25 text-white font-bold text-sm rounded-xl transition-all border border-white/10 shadow-sm gap-2 flex items-center justify-center"
            >
              <RefreshCw className={cn("w-4 h-4", tableLoading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* KPI Stats cards */}
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4 relative z-10">
          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-violet-100 uppercase tracking-wider">Average Rating</span>
              <div className="flex items-center gap-0.5 text-amber-300">
                <Star className="w-4 h-4 fill-current" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-1">
                {stats.average.toFixed(1)}
                <span className="text-xs text-violet-200 font-semibold">/ 5.0</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-violet-100 uppercase tracking-wider">Total Reviews</span>
              <MessageSquare className="w-4 h-4 text-violet-200" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-violet-100 uppercase tracking-wider">Positive Reviews</span>
              <ThumbsUp className="w-4 h-4 text-green-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {stats.positive}
                {stats.total > 0 && (
                  <span className="text-xs text-green-200 font-bold">
                    ({Math.round((stats.positive / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <span className="text-xs font-bold text-violet-100 uppercase tracking-wider">Negative Reviews</span>
              <ThumbsDown className="w-4 h-4 text-rose-300" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {stats.negative}
                {stats.total > 0 && (
                  <span className="text-xs text-rose-200 font-bold">
                    ({Math.round((stats.negative / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Moderation Ledger */}
      <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 items-center bg-zinc-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by reviewer, product name, or review content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-11 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600 transition-all placeholder:text-zinc-400 text-[#18181b]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-auto shrink-0 flex gap-2">
            <Select value={ratingFilter} onValueChange={(val) => setRatingFilter(val || "all")}>
              <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm w-40">
                <SelectValue placeholder="Rating Filter" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={(val) => setVisibilityFilter(val || "all")}>
              <SelectTrigger className="h-11 border-zinc-200 rounded-xl text-sm w-36">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 rounded-xl z-50">
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="h-11 px-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-500"
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
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-8 w-[220px]">Reviewer</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[240px]">Product Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[120px]">Rating</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Feedback Detail</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-[200px]">Attached Images</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right pr-8 w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                      <p className="text-xs font-semibold">Loading reviews table...</p>
                    </div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-550 font-medium">
                    No customer reviews found matching your search.
                  </td>
                </tr>
              ) : (
                reviews.map((item) => (
                  <tr key={item.id} className={cn("hover:bg-zinc-50/50 transition-all duration-200 align-top", item.is_hidden && "opacity-50 bg-rose-50/30")}>
                    <td className="px-6 py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-violet-50 text-violet-650 flex items-center justify-center font-bold text-sm border border-violet-100">
                          {item.reviewer_name.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-800 text-sm line-clamp-1 flex items-center gap-2" title={item.reviewer_name}>
                            {item.reviewer_name}
                            {item.is_hidden && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-bold uppercase tracking-wider">
                                <EyeOff className="w-2.5 h-2.5" /> Hidden
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-semibold mt-0.5">
                            {formatDate(item.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-800 text-sm leading-snug line-clamp-2" title={item.products?.name || "Unknown Product"}>
                        {item.products?.name || "Unknown Product"}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">ID: {item.product_id?.slice(0, 8) || "N/A"}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 w-fit">
                        <span className="text-xs font-bold text-amber-700">{item.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[320px]">
                      {item.title && (
                        <div className="font-bold text-zinc-900 text-sm mb-1 leading-snug">
                          {item.title}
                        </div>
                      )}
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-300" title={item.review}>
                        {item.review}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {item.images && item.images.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {item.images.map((imgUrl, index) => (
                            <div
                              key={index}
                              onClick={() => setSelectedImage(imgUrl)}
                              className="relative w-11 h-11 border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center p-0.5 cursor-zoom-in hover:border-violet-500 transition-all shadow-sm"
                            >
                              <img
                                src={imgUrl}
                                alt={`Review upload thumbnail ${index + 1}`}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">No attachments</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleHidden(item.id, item.is_hidden)}
                          disabled={togglingId === item.id}
                          className={cn(
                            "h-9 w-9 rounded-lg transition-all border border-transparent",
                            item.is_hidden
                              ? "hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 hover:border-emerald-100"
                              : "hover:bg-amber-50 text-zinc-400 hover:text-amber-600 hover:border-amber-100"
                          )}
                          title={item.is_hidden ? "Unhide Review" : "Hide Review"}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : item.is_hidden ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setReviewToDelete(item);
                            setIsConfirmOpen(true);
                          }}
                          className="h-9 w-9 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                          title="Delete Review"
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
            variantColor="purple"
          />
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-white border border-zinc-200 rounded-2xl max-w-md p-6 z-50">
          <DialogHeader>
            <DialogTitle className="text-zinc-950 font-bold text-lg">Delete Customer Review</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm mt-3">
              Are you sure you want to permanently delete this review by <span className="font-bold text-zinc-900">{reviewToDelete?.reviewer_name}</span>? 
              This action will remove it from database, deleting all associate votes, and the action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setReviewToDelete(null);
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
                <span>Delete Review</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white">
              <span className="font-bold text-zinc-900 text-sm">Review Image Preview</span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-zinc-50 flex items-center justify-center p-6 min-h-[50vh] relative">
              <img
                src={selectedImage}
                alt="Full review upload zoom preview"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
