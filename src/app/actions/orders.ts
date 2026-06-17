'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getReturnWindowInfo } from '@/lib/order'
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { number } from 'zod'


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
  taxAmount?: number
  shippingAmount?: number
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
  country?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

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

    // Rate Limiting / Checkout Throttling (Max 1 order per 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
    if (user) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', thirtySecondsAgo)

      if (count && count > 0) {
        console.warn(`Checkout throttled for user ${user.id}`)
        return { success: false, error: 'Please wait a moment before placing another order to prevent duplicates.' }
      }
    } else {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_email', orderData.email)
        .gte('created_at', thirtySecondsAgo)

      if (count && count > 0) {
        console.warn(`Checkout throttled for guest ${orderData.email}`)
        return { success: false, error: 'Please wait a moment before placing another order.' }
      }
    }


    // Secure Server-Side Math Calculation (GST & Shipping)
    const originState = "Punjab";
    const destState = orderData.state || "";
    const isIntraState = originState.toLowerCase() === destState.toLowerCase();

    let serverSubtotal = 0;
    let serverTaxExclusive = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const productIds = orderData.items.map(i => i.id);
    const { data: products } = await supabase.from('products').select('id, price, sale_price, igst_rate, cgst_rate, sgst_rate, is_tax_inclusive').in('id', productIds);

    const variantIds = orderData.items.filter(i => i.variant_id).map(i => i.variant_id);
    let variants: any[] = [];
    if (variantIds.length > 0) {
      const { data } = await supabase.from('product_variants').select('id, price, sale_price').in('id', variantIds);
      variants = data || [];
    }

    for (const item of orderData.items) {
      const prod = products?.find(p => p.id === item.id);
      let price = prod ? (Number(prod.sale_price || prod.price) || 0) : 0;

      if (item.variant_id) {
        const variant = variants.find(v => v.id === item.variant_id);
        if (variant) price = Number(variant.sale_price || variant.price) || 0;
      }

      const qty = item.quantity || 1;
      const itemTotal = price * qty;
      const igstRate = prod?.igst_rate || 0;
      const cgstRate = prod?.cgst_rate || 0;
      const sgstRate = prod?.sgst_rate || 0;

      serverSubtotal += itemTotal;
      let taxAmount = 0;
      let baseTotal = itemTotal;

      if (igstRate > 0) {
        if (prod?.is_tax_inclusive) {
          baseTotal = itemTotal / (1 + igstRate / 100);
          taxAmount = itemTotal - baseTotal;
        } else {
          taxAmount = itemTotal * (igstRate / 100);
          serverTaxExclusive += taxAmount;
        }
      }

      if (isIntraState) {
        cgstAmount += baseTotal * (cgstRate / 100);
        sgstAmount += baseTotal * (sgstRate / 100);
      } else {
        igstAmount += baseTotal * (igstRate / 100);
      }
    }

    // Resolve Shipping securely
    let serverShipping = 50;
    if (orderData.postalCode?.length === 6) {
      const { data: pinData } = await supabase.from('delivery_pincodes').select('*, delivery_zones(*)').eq('pincode', orderData.postalCode).eq('active', true).maybeSingle();
      if (pinData) {
        serverShipping = pinData.delivery_zones?.base_charge || 50;
      } else {
        const { data: zones } = await supabase.from('delivery_zones').select('*').eq('active', true);
        const prefix = orderData.postalCode.substring(0, 2);
        let matchedZone = zones?.find(z => z.coverage.split(',').map((p: string) => p.trim()).includes(prefix));
        if (!matchedZone) matchedZone = zones?.find(z => z.coverage.toLowerCase().includes('pan india') || z.name.toLowerCase().includes('rest of india'));
        serverShipping = matchedZone?.base_charge || 50;
      }
    }

    // Apply GST on Shipping (18%)
    const shippingGst = serverShipping * 0.18;
    serverTaxExclusive += shippingGst;
    if (isIntraState) {
      cgstAmount += shippingGst / 2;
      sgstAmount += shippingGst / 2;
    } else {
      igstAmount += shippingGst;
    }

    // Call Postgres RPC for transactional atomic order & inventory updates

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'place_order_safe',
      {
        p_user_id: user ? user.id : null,
        p_customer_name: orderData.fullName,
        p_customer_email: orderData.email,
        p_phone: orderData.phone,
        p_shipping_address: `${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.postalCode}`,
        p_payment_method: orderData.paymentMethod,
        p_delivery_estimate: orderData.deliveryEstimate || null,
        p_idempotency_key: `order_${Date.now()}_${user ? user.id : 'guest_' + Math.random().toString(36).substring(2, 9)}`, // Idempotency protection
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
        p_emi_details: orderData.emiDetails || null,
        p_tax_amount: orderData.taxAmount || 0,
        p_tax_exclusive_amount: serverTaxExclusive,
        p_cgst_amount: cgstAmount,
        p_sgst_amount: sgstAmount,
        p_igst_amount: igstAmount,
        p_shipping_amount: orderData.shippingAmount || 0,
        p_city: orderData.city || null,
        p_state: orderData.state || null,
        p_country: orderData.country || 'India'
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
          totalAmount: result.total_amount,
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

    const returnTrackingId = "RTK" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const updateData: any = {
      payment_status: 'Refund Pending',
      return_tracking_id: returnTrackingId,
      return_carrier: 'Reverse Logistics Partner'
    };
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
export async function deleteFailedOrder(orderId: string, targetStatus: 'CANCELLED' | 'FAILED' = 'CANCELLED') {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    // Retrieve order by ID (bypass client-side selector restriction to verify ownership)
    const serviceRoleSupabase = createServiceRoleClient();
    const { data: order, error: fetchError } = await serviceRoleSupabase
      .from('orders')
      .select('id, payment_status, user_id')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      console.error('deleteFailedOrder: order not found', fetchError)
      return { success: false, error: 'Order not found' }
    }

    // Access control check: if order belongs to a user, that user must match
    const isGuestOrder = !order.user_id;
    if (!isGuestOrder && (!user || order.user_id !== user.id)) {
      return { success: false, error: 'Access denied' }
    }

    // Only allow transition if payment hasn't been processed
    if (order.payment_status === 'Paid') {
      console.warn('deleteFailedOrder: attempted to fail/cancel a paid order', orderId)
      return { success: false, error: 'Cannot cancel a successfully paid order' }
    }

    // Call PostgreSQL RPC transition_order_status to fail/cancel
    const { data: rpcResult, error: rpcError } = await serviceRoleSupabase.rpc(
      'transition_order_status',
      {
        p_order_id: orderId,
        p_new_status: targetStatus,
        p_actor_type: user ? 'customer' : 'system',
        p_actor_id: user ? user.id : null,
        p_remarks: targetStatus === 'CANCELLED' ? 'Cancelled at payment window' : 'Payment failed'
      }
    )

    if (rpcError) {
      console.error('Order fail/cancel RPC error:', rpcError)
      return { success: false, error: 'Failed to update order status' }
    }

    revalidatePath('/account/orders')
    return { success: true }
  } catch (error: any) {
    console.error('deleteFailedOrder unexpected error:', error)
    return { success: false, error: error.message || 'Unexpected error' }
  }
}

export async function trackOrder(displayOrderId: string) {
  try {
    const trimmedId = displayOrderId.trim();
    if (!trimmedId.startsWith("OD")) {
      return { success: false, error: "Please enter a valid Order ID starting with 'OD'." };
    }
    const ts = parseInt(trimmedId.substring(2, 15));
    if (isNaN(ts)) {
      return { success: false, error: "Invalid Order ID format." };
    }

    const supabase = createServiceRoleClient(); // bypass RLS to query by created_at safely

    const { data: orders, error: err } = await supabase
      .from("orders")
      .select("*, order_items(*, products(id, name, slug, image_url, igst_rate, cgst_rate, sgst_rate, is_tax_inclusive, hsn_code)), payments(*)")
      .gte("created_at", new Date(ts - 5000).toISOString())
      .lte("created_at", new Date(ts + 5000).toISOString());

    if (err) throw err;

    const { getDisplayOrderId } = await import('@/lib/order');
    const found = orders?.find((o: any) => getDisplayOrderId(o.id, o.created_at) === trimmedId);

    if (!found) {
      return { success: false, error: "We couldn't find an order with that ID." };
    }

    return { success: true, order: found };
  } catch (error: any) {
    console.error("trackOrder action error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}


