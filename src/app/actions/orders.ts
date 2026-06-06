'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

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

    // Call Postgres RPC for transactional atomic order & inventory updates
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'place_order_with_inventory',
      {
        p_user_id: user.id,
        p_customer_name: orderData.fullName,
        p_customer_email: orderData.email,
        p_phone: orderData.phone,
        p_shipping_address: `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.postalCode}`,
        p_total_amount: orderData.total,
        p_payment_method: orderData.paymentMethod,
        p_payment_status: orderData.paymentMethod === 'COD' ? 'Unpaid' : 'Paid',
        p_delivery_estimate: orderData.deliveryEstimate || null,
        p_items: orderData.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        p_attribution: attribution
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

    revalidatePath('/account/orders')
    return { success: true, orderId: result.order_id }
  } catch (error: any) {
    console.error('createOrder unexpected error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}
