import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  const getRedirectUrl = (path: string) => {
    if (isLocalEnv) return `${origin}${path}`
    if (forwardedHost) return `https://${forwardedHost}${path}`
    return `${origin}${path}`
  }

  // Handle recovery / magic-link token hash flow (used by reset-password emails)
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await (supabase.auth as any).verifyOtp({ token_hash, type })

    if (!error) {
      // For recovery type, always redirect to the reset-password page
      const destination = type === 'recovery' ? '/reset-password' : next
      return NextResponse.redirect(getRedirectUrl(destination))
    }
  }

  // Handle PKCE code exchange flow (OAuth / email confirmation)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(getRedirectUrl(next))
    }
  }

  // Redirect to login with error state
  return NextResponse.redirect(getRedirectUrl(`/login?mode=login&error=Invalid+or+expired+link`))
}
