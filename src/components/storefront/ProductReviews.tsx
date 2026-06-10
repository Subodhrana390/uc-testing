"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

const REVIEWS_PER_PAGE = 3;

const RATING_LABELS = {
  5: "Excellent",
  4: "Very Good",
  3: "Good",
  2: "Fair",
  1: "Bad"
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  review: string;
  created_at: string;
};

export default function ProductReviews({ productId }: { productId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingStats, setRatingStats] = useState({ average: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0 });

  async function loadRatingStats() {
    const { data } = await supabase.from('product_reviews').select('rating').eq('product_id', productId);
    if (data) {
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      data.forEach(r => {
        counts[r.rating as keyof typeof counts]++;
        sum += r.rating;
      });
      setRatingStats({
        average: data.length > 0 ? sum / data.length : 0,
        counts,
        total: data.length
      });
    }
  }

  async function loadReviews(page: number = 1) {
    setLoading(true);
    const start = (page - 1) * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("product_reviews")
      .select("id, reviewer_name, rating, title, review, created_at", { count: "exact" })
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (!error) {
      setReviews((data as Review[]) || []);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  }

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
    loadReviews(1);
    loadRatingStats();
  }, [productId]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadReviews(newPage);
    if (containerRef.current) {
      const topOffset = containerRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  async function handleSubmit() {
    if (!review.trim()) {
      toast.error("Please enter your review");
      return;
    }

    const {
      data: { user },
    } = await (supabase.auth as any).getUser();

    if (!user) {
      toast("Please login to write a review");
      return;
    }

    setSubmitting(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const reviewerName = profile?.full_name || user.user_metadata?.full_name || user.email || "Customer";

    const { error } = await supabase.from("product_reviews").insert([
      {
        product_id: productId,
        user_id: user.id,
        reviewer_name: reviewerName,
        rating,
        title: title || null,
        review,
      },
    ]);

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Unable to submit review");
      return;
    }

    setReview("");
    setTitle("");
    setRating(5);
    toast.success("Review submitted");
    setCurrentPage(1);
    loadReviews(1);
    loadRatingStats();
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-950 flex items-center gap-2">
          <span>Product Reviews</span>
          <span className="text-sm font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600">Customer feedback, buying experience and product usage notes.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Rating Summary Snapshot */}
          <div className="flex flex-col sm:flex-row gap-8 mb-8 bg-zinc-50/50 border border-zinc-100 p-6 sm:p-8 rounded-[2rem]">
            <div className="flex flex-col items-center justify-center sm:w-1/3 border-b sm:border-b-0 sm:border-r border-zinc-200 pb-6 sm:pb-0">
              <h3 className="text-6xl font-black text-zinc-950">{ratingStats.average.toFixed(1)}</h3>
              <div className="flex items-center gap-1 text-amber-500 mt-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={`h-5 w-5 ${index < Math.round(ratingStats.average) ? "fill-current" : "text-zinc-200"}`} />
                ))}
              </div>
              <p className="text-sm font-bold text-zinc-500 mt-2">{ratingStats.total} Reviews</p>
            </div>
            <div className="flex-1 space-y-3">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingStats.counts[star as keyof typeof ratingStats.counts];
                const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-4 text-sm">
                    <div className="w-32 shrink-0 flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-900">{star} Star</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{RATING_LABELS[star as keyof typeof RATING_LABELS]}</span>
                    </div>
                    <div className="flex-1 h-3 bg-zinc-200/60 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-10 text-right font-bold text-zinc-400 shrink-0">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div ref={containerRef}>
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: REVIEWS_PER_PAGE }).map((_, i) => (
                  <div key={i} className="border-b border-zinc-100 py-8 first:pt-0 last:border-0 animate-pulse">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-200" />
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-zinc-200 rounded" />
                          <div className="h-2 w-16 bg-zinc-200 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="h-4 w-4 rounded-sm bg-zinc-200" />
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 space-y-2.5">
                      <div className="h-3 w-1/4 bg-zinc-200 rounded" />
                      <div className="h-3 w-full bg-zinc-200 rounded" />
                      <div className="h-3 w-5/6 bg-zinc-200 rounded" />
                      <div className="h-3 w-4/6 bg-zinc-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-0">
                {reviews.map((item) => (
                  <div key={item.id} className="border-b border-zinc-100 py-8 first:pt-0 last:border-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center font-black text-xl uppercase border border-zinc-200/60 shadow-sm">
                          {item.reviewer_name.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-950 text-base">{item.reviewer_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star key={index} className={`h-3.5 w-3.5 ${index < item.rating ? "fill-current" : "text-zinc-200"}`} />
                              ))}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              {RATING_LABELS[item.rating as keyof typeof RATING_LABELS]}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {item.title && <h4 className="mt-4 font-bold text-zinc-900 text-lg">{item.title}</h4>}
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{item.review}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 rounded-2xl">
                No reviews yet. Be the first customer to share feedback.
              </div>
            )}
          </div>

          {totalCount > REVIEWS_PER_PAGE && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-100 mt-6 gap-4">
              <div className="text-sm text-zinc-500">
                Showing <span className="font-medium text-zinc-900">{((currentPage - 1) * REVIEWS_PER_PAGE) + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * REVIEWS_PER_PAGE, totalCount)}</span> of <span className="font-medium text-zinc-900">{totalCount}</span> reviews
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="inline-flex items-center justify-center w-10 h-10 border border-zinc-200 bg-white text-zinc-900 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-wrap items-center justify-center gap-1">
                  {Array.from({ length: Math.ceil(totalCount / REVIEWS_PER_PAGE) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`inline-flex items-center justify-center w-10 h-10 border rounded-full text-sm transition-all shadow-sm ${currentPage === pageNum
                        ? "border-zinc-900 bg-zinc-900 text-white font-bold"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 hover:border-zinc-300"
                        } disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === Math.ceil(totalCount / REVIEWS_PER_PAGE) || loading}
                  className="inline-flex items-center justify-center w-10 h-10 border border-zinc-200 bg-white text-zinc-900 rounded-full hover:bg-zinc-100 hover:border-zinc-300 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-zinc-100 bg-zinc-50/50 p-6 sm:p-8 rounded-[2rem] h-fit sticky top-24">
          <div className="space-y-1 mb-6">
            <h3 className="text-xl font-black text-zinc-950">Write a Review</h3>
            <p className="text-sm text-zinc-500">Share your thoughts with other customers</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-900">Overall Rating</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setRating(index + 1)}
                      className={`transition-all hover:scale-110 focus:outline-none ${index < rating ? "text-amber-500" : "text-zinc-200 hover:text-amber-300"}`}
                    >
                      <Star className={`h-7 w-7 ${index < rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  {RATING_LABELS[rating as keyof typeof RATING_LABELS]}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="review-body" className="text-sm font-bold text-zinc-900">Your Experience</label>
              <textarea
                id="review-body"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you like or dislike? What did you use this product for?"
                rows={5}
                className="flex w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm resize-none"
              />
            </div>

            <button
              className="w-full inline-flex items-center justify-center h-12 px-6 py-3 rounded-xl bg-zinc-950 text-white font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg active:scale-[0.98] mt-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting Review..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
