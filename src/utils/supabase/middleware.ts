import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const customCookieOptions = isAdminRoute ? {
    name: 'sb-admin-auth-token',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  } : undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    pathname.includes('/favicon.ico') ||
    pathname.includes('/logo.jpg') ||
    pathname.includes('/images/')
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  // Handle protected admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      if (!pathname.startsWith("/admin/login")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }
    } else {
      // User is logged in, check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      } else if (pathname === "/admin/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    }
  }

  // Handle customer account and checkout routes
  if (!user && (pathname.startsWith("/account") || pathname === "/checkout")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Handle login/register redirects for already logged in users
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/profile";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
