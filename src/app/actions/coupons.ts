'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function validateCouponAction(code: string, subtotal: number) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Please log in to apply coupons.' }
    }

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      return { success: false, error: 'Please enter a coupon code.' }
    }

    // Fetch coupon from database
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', trimmedCode)
      .eq('active', true)
      .maybeSingle()

    if (fetchError || !coupon) {
      return { success: false, error: 'Coupon code is invalid or inactive.' }
    }

    // Check start date
    if (coupon.start_date && new Date() < new Date(coupon.start_date)) {
      return { success: false, error: 'Coupon code is not active yet.' }
    }

    // Check expiration date
    if (coupon.expiration_date && new Date() > new Date(coupon.expiration_date)) {
      return { success: false, error: 'Coupon code has expired.' }
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { success: false, error: 'Coupon code has reached its usage limit.' }
    }

    // Check minimum order amount
    if (subtotal < parseFloat(coupon.min_order_amount)) {
      return { 
        success: false, 
        error: `This coupon requires a minimum purchase of ₹${parseFloat(coupon.min_order_amount).toFixed(2)}.` 
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100)
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount))
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = parseFloat(coupon.discount_value)
    }

    discountAmount = Math.min(discountAmount, subtotal)

    return {
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: parseFloat(coupon.discount_value),
        min_order_amount: parseFloat(coupon.min_order_amount),
        max_discount_amount: coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : null,
      },
      discountAmount
    }
  } catch (error: any) {
    console.error('validateCouponAction error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

async function checkAdminRole(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin'
}

export async function getCouponsAction() {
  try {
    const supabase = await createClient()
    const isAdmin = await checkAdminRole(supabase)
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required.' }
    }

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, coupons }
  } catch (error: any) {
    console.error('getCouponsAction error:', error)
    return { success: false, error: error.message || 'Failed to fetch coupons.' }
  }
}

export async function createCouponAction(data: {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number
  start_date?: string
  expiration_date?: string
  usage_limit?: number
  active?: boolean
}) {
  try {
    const supabase = await createClient()
    const isAdmin = await checkAdminRole(supabase)
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required.' }
    }

    const formattedCode = data.code.trim().toUpperCase()
    if (!formattedCode) {
      return { success: false, error: 'Coupon code is required.' }
    }

    const insertData: any = {
      code: formattedCode,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_amount: data.min_order_amount || 0,
      max_discount_amount: data.max_discount_amount || null,
      start_date: data.start_date || null,
      expiration_date: data.expiration_date || null,
      usage_limit: data.usage_limit || null,
      active: data.active !== undefined ? data.active : true,
    }

    const { data: newCoupon, error } = await supabase
      .from('coupons')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A coupon with this code already exists.' }
      }
      throw error
    }

    revalidatePath('/uc-admin-portal/coupons')
    return { success: true, coupon: newCoupon }
  } catch (error: any) {
    console.error('createCouponAction error:', error)
    return { success: false, error: error.message || 'Failed to create coupon.' }
  }
}

export async function toggleCouponActiveAction(id: string, active: boolean) {
  try {
    const supabase = await createClient()
    const isAdmin = await checkAdminRole(supabase)
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required.' }
    }

    const { error } = await supabase
      .from('coupons')
      .update({ active })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/uc-admin-portal/coupons')
    return { success: true }
  } catch (error: any) {
    console.error('toggleCouponActiveAction error:', error)
    return { success: false, error: error.message || 'Failed to update coupon status.' }
  }
}

export async function deleteCouponAction(id: string) {
  try {
    const supabase = await createClient()
    const isAdmin = await checkAdminRole(supabase)
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required.' }
    }

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/uc-admin-portal/coupons')
    return { success: true }
  } catch (error: any) {
    console.error('deleteCouponAction error:', error)
    return { success: false, error: error.message || 'Failed to delete coupon.' }
  }
}
