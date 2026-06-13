-- Add images array column to product_reviews
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[];

-- Create review votes table (likes and dislikes)
CREATE TABLE IF NOT EXISTS public.product_review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

-- Enable Row Level Security on votes
ALTER TABLE public.product_review_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read votes" ON public.product_review_votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON public.product_review_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.product_review_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.product_review_votes;

-- Create policies for product_review_votes
CREATE POLICY "Public read votes"
  ON public.product_review_votes FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own votes"
  ON public.product_review_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.product_review_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.product_review_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Register review-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies for review-images
DROP POLICY IF EXISTS "Allow authenticated users to insert review images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select review images" ON storage.objects;

CREATE POLICY "Allow authenticated users to insert review images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Allow public select review images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-images');
