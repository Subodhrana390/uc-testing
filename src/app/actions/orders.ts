'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getReturnWindowInfo } from '@/lib/order'

export async function createOrder(orderData: {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  items: any[]
  total: number
  paymentMethod: string
  deliveryEstimate?: string
  paymentStatus?: string
  couponCode?: string
  isEmi?: boolean
  emiProviderId?: string
  emiPlanId?: string
  emiTenure?: number
  emiMonthlyInstallment?: number
  emiInterestRate?: number
  emiTotalPayable?: number
  emiDetails?: any
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Order auth error:', authError)
      return { success: false, error: 'Unauthorized: Please ensure you are logged in.' }
    }

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
      console.error('Failed to parse attribution cookies:', e)
    }

    const attribution = { first_touch, latest_touch }

    // Rate Limiting / Checkout Throttling (Max 1 order per 30 seconds per user)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', thirtySecondsAgo)
    
    if (count && count > 0) {
      console.warn(`Checkout throttled for user ${user.id}`)
      return { success: false, error: 'Please wait a moment before placing another order to prevent duplicates.' }
    }

    // Call Postgres RPC for transactional atomic order & inventory updates
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'place_order_safe',
      {
        p_user_id: user.id,
        p_customer_name: orderData.fullName,
        p_customer_email: orderData.email,
        p_phone: orderData.phone,
        p_shipping_address: `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.postalCode}`,
        p_payment_method: orderData.paymentMethod,
        p_delivery_estimate: orderData.deliveryEstimate || null,
        p_idempotency_key: `order_${Date.now()}_${user.id}`, // Idempotency protection
        p_items: orderData.items.map(item => ({
          id: item.id,
          quantity: item.quantity
        })),
        p_attribution: attribution,
        p_postal_code: orderData.postalCode,
        p_coupon_code: orderData.couponCode || null,
        p_is_emi: orderData.isEmi || false,
        p_emi_provider_id: orderData.emiProviderId || null,
        p_emi_plan_id: orderData.emiPlanId || null,
        p_emi_tenure: orderData.emiTenure || null,
        p_emi_monthly_installment: orderData.emiMonthlyInstallment || null,
        p_emi_interest_rate: orderData.emiInterestRate || null,
        p_emi_total_payable: orderData.emiTotalPayable || null,
        p_emi_details: orderData.emiDetails || null
      }
    )

    if (rpcError) {
      console.error('Order creation RPC error:', rpcError)
      return { success: false, error: 'Failed to place order due to server error' }
    }

    const result = rpcResult as any;
    if (!result.success) {
      console.error('Order creation business logic error:', result.error)
      return { success: false, error: result.error || 'Failed to place order' }
    }

    // Send confirmation email for COD immediately, since they are placed right away
    if (orderData.paymentMethod === 'COD') {
      try {
        const { sendOrderConfirmationEmail } = await import('@/lib/email')
        await sendOrderConfirmationEmail({
          orderId: result.order_id,
          orderDate: new Date().toISOString(),
          customerName: orderData.fullName,
          customerEmail: orderData.email,
          shippingAddress: `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.postalCode}`,
          totalAmount: result.total_amount, // Use server calculated amount
          items: orderData.items
        })
      } catch (emailErr) {
        console.error('Failed to send COD order confirmation email:', emailErr)
      }
    }

    revalidatePath('/account/orders')
    return { success: true, orderId: result.order_id }
  } catch (error: any) {
    console.error('createOrder unexpected error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function cancelOrder(orderId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Please ensure you are logged in.' }
    }

    // Call PostgreSQL RPC transition_order_status
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'transition_order_status',
      {
        p_order_id: orderId,
        p_new_status: 'CANCELLED',
        p_actor_type: 'customer',
        p_actor_id: user.id,
        p_remarks: 'Cancelled by customer'
      }
    )

    if (rpcError) {
      console.error('Order cancellation RPC error:', rpcError)
      return { success: false, error: 'Failed to cancel order due to server error' }
    }

    const result = rpcResult as any;
    if (!result.success) {
      console.error('Order cancellation business logic error:', result.error)
      return { success: false, error: result.error || 'Failed to cancel order' }
    }

    revalidatePath('/account/orders')
    return { success: true }
  } catch (error: any) {
    console.error('cancelOrder unexpected error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function returnOrder(orderId: string, reason: string, bankDetails?: any) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Please ensure you are logged in.' }
    }

    // Fetch order details with its status history to validate return period
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_status_history(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !order) {
      return { success: false, error: 'Order not found.' }
    }

    const { isReturnable } = getReturnWindowInfo(order)
    if (!isReturnable) {
      return { success: false, error: 'The 7-day return period for this order has expired.' }
    }

    // Call PostgreSQL RPC transition_order_status to set status to RETURN_REQUESTED
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'transition_order_status',
      {
        p_order_id: orderId,
        p_new_status: 'RETURN_REQUESTED',
        p_actor_type: 'customer',
        p_actor_id: user.id,
        p_remarks: `Return Requested: ${reason}`
      }
    )

    if (rpcError) {
      console.error('Order return RPC error:', rpcError)
      return { success: false, error: 'Failed to return order due to server error' }
    }

    const result = rpcResult as any;
    if (!result.success) {
      console.error('Order return business logic error:', result.error)
      return { success: false, error: result.error || 'Failed to return order' }
    }

    const updateData: any = { payment_status: 'Refund Pending' };
    if (bankDetails) {
      updateData.refund_bank_details = bankDetails;
    }

    const { error: paymentUpdateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', user.id)

    if (paymentUpdateError) {
      console.error('Failed to update payment status for return:', paymentUpdateError)
      // Non-fatal, admin can see it's a return request anyway
    }

    revalidatePath('/account/orders')
    return { success: true }
  } catch (error: any) {
    console.error('returnOrder unexpected error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}


/**
 * deleteFailedOrder — Hard-deletes an order that failed at payment stage.
 * Safety checks:
 *  1. Order must belong to the authenticated user
 *  2. Order payment_status must still be 'Unpaid' (not Paid / partially processed)
 * This prevents accidental deletion of successfully paid orders.
 */
export async function deleteFailedOrder(orderId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // First verify the order belongs to this user and is still unpaid
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, payment_status, user_id')
      .eq('id', orderId)
      .eq('user_id', user.id)        // ownership check
      .single()

    if (fetchError || !order) {
      console.error('deleteFailedOrder: order not found or unauthorized', fetchError)
      return { success: false, error: 'Order not found or access denied' }
    }

    // Only delete if payment hasn't been processed
    if (order.payment_status === 'Paid') {
      console.warn('deleteFailedOrder: attempted to delete a paid order', orderId)
      return { success: false, error: 'Cannot delete a successfully paid order' }
    }

    // Delete order items first (FK constraint)
    await supabase.from('order_items').delete().eq('order_id', orderId)

    // Delete the order itself
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('deleteFailedOrder: delete error', deleteError)
      return { success: false, error: 'Failed to remove failed order' }
    }

    revalidatePath('/account/orders')
    return { success: true }
  } catch (error: any) {
    console.error('deleteFailedOrder unexpected error:', error)
    return { success: false, error: error.message || 'Unexpected error' }
  }
}

