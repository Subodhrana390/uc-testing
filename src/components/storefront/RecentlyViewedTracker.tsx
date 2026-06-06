"use client";

import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/recentlyViewed";

interface Props {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category_name: string | null;
}

/**
 * Invisible component — call inside any product detail page.
 * Adds the product to the localStorage recently-viewed list on mount.
 */
export default function RecentlyViewedTracker(props: Props) {
  useEffect(() => {
    addRecentlyViewed(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return null;
}
