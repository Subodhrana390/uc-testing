"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Star, ThumbsUp, ThumbsDown, Camera, Upload, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";
import { useLoginRedirect } from "@/hooks/useLoginRedirect";

const REVIEWS_PER_PAGE = 3;

const RATING_LABELS = {
  5: "Excellent",
  4: "Very Good",
  3: "Good",
  2: "Fair",
  1: "Bad"
};

type Vote = {
  user_id: string;
  vote_type: "like" | "dislike";
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  review: string;
  created_at: string;
  images?: string[];
  product_review_votes?: Vote[];
};

export default function ProductReviews({ productId }: { productId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { redirectToLogin } = useLoginRedirect();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingStats, setRatingStats] = useState({ average: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Image Upload States
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Lightbox Preview State
  const [selectedReviewImage, setSelectedReviewImage] = useState<string | null>(null);

  async function loadRatingStats() {
    const { data } = await supabase.from('product_reviews').select('rating').eq('product_id', productId).eq('is_hidden', false);
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
      .select("id, reviewer_name, rating, title, review, created_at, images, product_review_votes(user_id, vote_type)", { count: "exact" })
      .eq("product_id", productId)
      .eq("is_hidden", false)
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleVote = async (reviewId: string, voteType: "like" | "dislike") => {
    if (!currentUserId) {
      toast("Please login to vote on reviews");
      redirectToLogin();
      return;
    }

    const reviewItem = reviews.find(r => r.id === reviewId);
    if (!reviewItem) return;

    const existingVote = reviewItem.product_review_votes?.find(v => v.user_id === currentUserId);

    try {
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Delete vote (unvote)
          const { error } = await supabase
            .from("product_review_votes")
            .delete()
            .eq("review_id", reviewId)
            .eq("user_id", currentUserId);
          if (error) throw error;
        } else {
          // Update vote (switch type)
          const { error } = await supabase
            .from("product_review_votes")
            .update({ vote_type: voteType })
            .eq("review_id", reviewId)
            .eq("user_id", currentUserId);
          if (error) throw error;
        }
      } else {
        // Insert new vote
        const { error } = await supabase
          .from("product_review_votes")
          .insert({
            review_id: reviewId,
            user_id: currentUserId,
            vote_type: voteType
          });
        if (error) throw error;
      }
      loadReviews(currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit vote");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (uploadedImages.length + files.length > 5) {
      toast.error("You can upload up to 5 images only.");
      return;
    }

    setUploadingImage(true);
    try {
      const newImages = [...uploadedImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error("Please upload image files only");
          continue;
        }
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { data, error } = await supabase.storage
          .from("review-images")
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("review-images")
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }
      setUploadedImages(newImages);
      toast.success("Photos uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

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
      redirectToLogin();
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
        images: uploadedImages,
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
    setUploadedImages([]);
    toast.success("Review submitted");
    setCurrentPage(1);
    loadReviews(1);
    loadRatingStats();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="mt-2 text-sm text-zinc-600">Customer feedback, buying experience and product usage notes.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Rating Summary Snapshot */}
          <div className="flex flex-col sm:flex-row gap-8 mb-8 p-6 sm:p-8">
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
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingStats.counts[star as keyof typeof ratingStats.counts];
                const percentage =
                  ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-4 text-sm">
                    <div className="w-32 shrink-0 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < star
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-300"
                            }`}
                        />
                      ))}
                    </div>

                    <div className="flex-1 h-3 bg-zinc-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="w-10 text-right font-bold text-zinc-400 shrink-0">
                      {count}
                    </div>
                  </div>
                );
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
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {item.title && <h4 className="mt-4 font-bold text-zinc-900 text-lg">{item.title}</h4>}
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{item.review}</p>
                    
                    {/* Review Images */}
                    {item.images && item.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedReviewImage(img)}
                            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-zinc-200 cursor-zoom-in bg-zinc-50 flex items-center justify-center p-1 hover:border-zinc-400 transition-all shadow-sm"
                          >
                            <img
                              src={img}
                              alt={`Review upload ${idx + 1}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Review Likes/Dislikes */}
                    {(() => {
                      const votes = item.product_review_votes || [];
                      const likeCount = votes.filter(v => v.vote_type === "like").length;
                      const dislikeCount = votes.filter(v => v.vote_type === "dislike").length;
                      const userVote = votes.find(v => v.user_id === currentUserId);
                      const userHasLiked = userVote?.vote_type === "like";
                      const userHasDisliked = userVote?.vote_type === "dislike";

                      return (
                        <div className="flex items-center gap-4 mt-4 text-zinc-400">
                          <button
                            onClick={() => handleVote(item.id, "like")}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-semibold hover:text-zinc-900 transition-colors",
                              userHasLiked ? "text-indigo-600 font-bold" : ""
                            )}
                          >
                            <ThumbsUp className={cn("h-4 w-4", userHasLiked ? "fill-current" : "")} />
                            <span>{likeCount}</span>
                          </button>
                          <button
                            onClick={() => handleVote(item.id, "dislike")}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-semibold hover:text-zinc-900 transition-colors",
                              userHasDisliked ? "text-zinc-700 font-bold" : ""
                            )}
                          >
                            <ThumbsDown className={cn("h-4 w-4", userHasDisliked ? "fill-current" : "")} />
                            <span>{dislikeCount}</span>
                          </button>
                        </div>
                      );
                    })()}
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
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-zinc-500" />
                <span>Upload Photos (Optional)</span>
              </label>

              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative w-16 h-16 border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center p-1 group">
                      <img src={url} alt={`Upload preview ${index + 1}`} className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(index)}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all scale-75 shadow-sm"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedImages.length < 5 && (
                <label className="flex items-center justify-center gap-2 w-full h-11 border border-dashed border-zinc-300 rounded-xl hover:border-zinc-950 hover:bg-zinc-50/50 transition-all cursor-pointer">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950" />
                      <span className="text-xs font-semibold text-zinc-500">Upload Photos (Max 5)</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
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
              disabled={submitting || uploadingImage}
            >
              {submitting ? "Submitting Review..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedReviewImage && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-white">
              <span className="font-bold text-zinc-900 text-sm">Image Preview</span>
              <button
                type="button"
                onClick={() => setSelectedReviewImage(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-zinc-50 flex items-center justify-center p-6 min-h-[50vh] relative">
              <img
                src={selectedReviewImage}
                alt="Full review upload"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
