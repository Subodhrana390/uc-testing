import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * useLoginRedirect
 * 
 * Returns a function `redirectToLogin()` that navigates the user to
 * /login with a `returnTo` param containing the current full URL
 * (pathname + search string), so after login the app can send them back.
 *
 * Usage:
 *   const { redirectToLogin } = useLoginRedirect();
 *   redirectToLogin(); // → /login?returnTo=%2Fproducts%2Fsome-slug
 */
export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectToLogin = useCallback(() => {
    const searchStr = searchParams.toString();
    const fullPath = searchStr ? `${pathname}?${searchStr}` : pathname;
    router.push(`/login?returnTo=${encodeURIComponent(fullPath)}`);
  }, [router, pathname, searchParams]);

  return { redirectToLogin };
}
