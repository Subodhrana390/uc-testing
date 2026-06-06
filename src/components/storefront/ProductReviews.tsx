"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

const REVIEWS_PER_PAGE = 5;

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
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadReviews(page = 1) {
    setLoading(true);
    const from = (page - 1) * REVIEWS_PER_PAGE;
    const to = from + REVIEWS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("product_reviews")
      .select("id, reviewer_name, rating, title, review, created_at", { count: "exact" })
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setReviews((data as Review[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReviews(currentPage);
  }, [productId, currentPage]);

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
        review,
      },
    ]);

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Unable to submit review");
      return;
    }

    setReview("");
    setRating(5);
    toast.success("Review submitted");
    setCurrentPage(1);
    loadReviews(1);
  }

  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE);

  return (
    <section className="mt-12 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-950">Product Reviews</h2>
        <p className="mt-2 text-sm text-zinc-600">Customer feedback, buying experience and product usage notes.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {loading ? (
            <div className="border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Loading reviews...</div>
          ) : reviews.length > 0 ? (
            <>
              <div className="space-y-4">
                {reviews.map((item) => (
                  <div key={item.id} className="border border-zinc-200 bg-white p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-950">{item.reviewer_name}</p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{formatDate(item.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index} className={`h-4 w-4 ${index < item.rating ? "fill-current" : ""}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{item.review}</p>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-none border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn(
                          "inline-flex items-center justify-center h-8 min-w-[2rem] rounded-none px-2 text-xs font-bold transition-all",
                          currentPage === i + 1 
                            ? "bg-zinc-950 text-white" 
                            : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-none border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
              No reviews yet. Be the first customer to share feedback.
            </div>
          )}
        </div>

        <div className="border border-orange-100 bg-orange-50 p-6">
          <h3 className="text-xl font-black text-zinc-950">Write a Review</h3>
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <button key={index} type="button" onClick={() => setRating(index + 1)} className="text-amber-500">
                <Star className={`h-5 w-5 ${index < rating ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <textarea 
              value={review} 
              onChange={(e) => setReview(e.target.value)} 
              placeholder="Share your product and buying experience" 
              rows={5} 
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button 
              className="w-full inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-zinc-950 text-white font-bold hover:bg-primary transition-all disabled:opacity-50 disabled:pointer-events-none" 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
