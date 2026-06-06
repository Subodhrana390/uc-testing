/**
 * Recently Viewed Products — localStorage utility
 * Stores up to MAX_ITEMS product slugs with timestamps.
 */

const STORAGE_KEY = "uc_recently_viewed";
const MAX_ITEMS = 12;

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category_name: string | null;
  viewedAt: number; // epoch ms
}

/** Read the full list (newest first). */
export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

/** Add / refresh a product in the recently viewed list. */
export function addRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed().filter((p) => p.id !== item.id);
    const updated: RecentlyViewedItem[] = [
      { ...item, viewedAt: Date.now() },
      ...existing,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("recently-viewed-updated"));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

/** Get IDs of recently viewed products (for Supabase queries). */
export function getRecentlyViewedIds(): string[] {
  return getRecentlyViewed().map((p) => p.id);
}

/** Get category names from recently viewed (for recommendation logic). */
export function getRecentlyViewedCategories(): string[] {
  const cats = getRecentlyViewed()
    .map((p) => p.category_name)
    .filter(Boolean) as string[];
  return [...new Set(cats)]; // deduplicated
}

/** Clear the recently viewed list. */
export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("recently-viewed-updated"));
  } catch {}
}
