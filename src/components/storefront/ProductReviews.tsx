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
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  async function loadInitialReviews() {
    setLoading(true);
    const { data, error, count } = await supabase
      .from("product_reviews")
      .select("id, reviewer_name, rating, title, review, created_at", { count: "exact" })
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(0, 2); // Fetch latest 3 (indexes 0, 1, 2)

    if (!error) {
      setReviews((data as Review[]) || []);
      setTotalCount(count || 0);
      setIsExpanded(false);
    }
    setLoading(false);
  }

  async function loadAllReviews() {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, reviewer_name, rating, title, review, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (!error) {
      setReviews((data as Review[]) || []);
      setIsExpanded(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInitialReviews();
  }, [productId]);

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
    loadInitialReviews();
  }

  return (
    <section className="mt-12 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-950 flex items-center gap-2">
          <span>Product Reviews</span>
          <span className="text-sm font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600">Customer feedback, buying experience and product usage notes.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {loading && reviews.length === 0 ? (
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

              {!isExpanded && totalCount > 3 && (
                <div className="pt-4 text-center">
                  <button
                    onClick={loadAllReviews}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-6 py-2.5 border border-zinc-900 bg-white text-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    View More Reviews
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
