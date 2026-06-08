import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/uc-admin-portal");
  const customCookieOptions = isAdminRoute ? {
    name: 'sb-admin-auth-token',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  } : undefined;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      ...(customCookieOptions ? { cookieOptions: customCookieOptions as any } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  );

  // Do not run auth logic for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.png') ||
    pathname.includes('/logo.png') ||
    pathname.includes('/images/')
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  // Fetch user role if user is authenticated
  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profile?.status === 'suspended') {
      await (supabase.auth as any).signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    userRole = profile?.role || null;
  }

  // Handle protected admin routes
  if (pathname.startsWith("/uc-admin-portal")) {
    if (!user) {
      if (!pathname.startsWith("/uc-admin-portal/login")) {
        const url = request.nextUrl.clone();
        url.pathname = "/uc-admin-portal/login";
        return NextResponse.redirect(url);
      }
    } else {
      if (userRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      } else if (pathname === "/uc-admin-portal/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/uc-admin-portal";
        return NextResponse.redirect(url);
      }
    }
  }

  // Handle customer account and checkout routes
  if (pathname.startsWith("/account") || pathname === "/checkout") {
    if (!user) {
      // Preserve full URL including search params so user returns to exact page+state after login
      const originalUrl = request.nextUrl.clone();
      const searchStr = originalUrl.search; // includes "?" prefix if present
      const fullReturnTo = pathname + (searchStr || "");

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("returnTo", fullReturnTo);
      return NextResponse.redirect(loginUrl);
    } else if (userRole !== "customer") {
      // Prevent admins from accessing customer-only account/checkout pages
      const url = request.nextUrl.clone();
      url.pathname = "/uc-admin-portal";
      return NextResponse.redirect(url);
    }
  }

  // Handle login/register redirects for already logged in users
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    if (userRole === "admin") {
      url.pathname = "/uc-admin-portal";
    } else {
      url.pathname = "/account/profile";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
