'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin-server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { env } from '@/env'

export async function login(formData: FormData) {
  const redirectTo = (formData.get('redirectTo') as string) || '/account/profile'
  const isAdminLogin = redirectTo.startsWith('/uc-admin-portal')

  const supabase = await (isAdminLogin ? createAdminClient() : createClient())

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: { user }, error } = await (supabase.auth as any).signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Email not confirmed. Please check your email to verify your account." }
    }
    return { error: error.message }
  }

  // Role check based on login type
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user?.id)
    .single()

  if (profile?.status === 'suspended') {
    await (supabase.auth as any).signOut()
    return { error: 'Your account has been suspended. Please contact support for assistance.' }
  }

  if (isAdminLogin) {
    if (profile?.role !== 'admin') {
      await (supabase.auth as any).signOut()
      return { error: 'Unauthorized access. Admin credentials required.' }
    }
  } else {
    if (profile?.role !== 'customer') {
      await (supabase.auth as any).signOut()
      return { error: 'Unauthorized access. Customer credentials required.' }
    }
  }

  return { success: true, redirectTo }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const gst = formData.get('gst') as string

  const { data, error } = await (supabase.auth as any).signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone_number: phone,
        gst_number: gst,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Read attribution cookies
    const cookieStore = cookies()
    const firstTouchStr = cookieStore.get('first_touch_attribution')?.value
    const latestTouchStr = cookieStore.get('latest_touch_attribution')?.value

    let first_touch = {}
    let latest_touch = {}

    try {
      if (firstTouchStr) first_touch = JSON.parse(firstTouchStr)
      if (latestTouchStr) latest_touch = JSON.parse(latestTouchStr)
    } catch (e) {
      console.error('Failed to parse attribution cookies in signup:', e)
    }

    // Fallback: if cookies were blocked or empty, parse tracking parameters from formData
    const trackingParams: Record<string, string> = {}
    const TRACKING_PARAMS = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "gclid", "fbclid", "msclkid", "ttclid", "affiliate_id", "referral_code"
    ] as const;

    TRACKING_PARAMS.forEach(param => {
      const val = formData.get(param);
      if (val && typeof val === 'string' && val.trim() !== '') {
        trackingParams[param] = val.trim();
      }
    });

    if (Object.keys(first_touch).length === 0 && Object.keys(trackingParams).length > 0) {
      first_touch = trackingParams;
    }
    if (Object.keys(latest_touch).length === 0 && Object.keys(trackingParams).length > 0) {
      latest_touch = trackingParams;
    }

    const attribution = { first_touch, latest_touch };

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: name,
      phone,
      gst_number: gst || null,
      role: 'customer',
      updated_at: new Date().toISOString(),
      attribution: attribution,
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signout() {
  const supabase = await createClient()
  await (supabase.auth as any).signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function adminSignout() {
  const supabase = await createAdminClient()
  await (supabase.auth as any).signOut()
  revalidatePath('/uc-admin-portal', 'layout')
  redirect('/uc-admin-portal/login')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || !confirmPassword) {
    return { error: "Both fields are required." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  const { error } = await (supabase.auth as any).updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function adminUpdatePassword(formData: FormData) {
  const supabase = await createAdminClient()
  const password = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || !confirmPassword) {
    return { error: "Both fields are required." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  const { error } = await (supabase.auth as any).updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function requestPasswordReset(formData: FormData, origin: string) {
  const email = formData.get('email') as string
  if (!email) {
    return { error: "Email is required." }
  }

  try {
    const supabaseAdmin = await createServiceRoleClient()

    // 1. Generate the recovery link using the admin client
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/api/auth/callback?next=/reset-password`
      }
    })

    if (linkError) {
      return { error: linkError.message }
    }

    const resetLink = `${origin}/api/auth/callback?token_hash=${linkData.properties.hashed_token}&type=recovery&next=/reset-password`;

    // 2. Fetch the customer's name for personalization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('email', email)
      .single()

    const customerName = profile?.full_name || email.split('@')[0];

    // 3. Send the email using our Brevo SDK implementation natively
    const { sendResetPasswordEmail } = await import('@/lib/email');
    await sendResetPasswordEmail(email, customerName, resetLink);

    return { success: true }
  } catch (err: any) {
    console.error("Error in requestPasswordReset:", err);
    return { error: "An unexpected error occurred while sending the reset email." }
  }
}
