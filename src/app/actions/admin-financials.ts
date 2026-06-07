'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Razorpay from 'razorpay'

async function logAudit(supabase: any, adminId: string, action: string, entityType: string, entityId: string, oldValue: any, newValue: any) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue
  })
}

export async function approveReturn(orderId: string, adminNotes: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user || !user.email?.endsWith('@ucenterprises.com')) {
    return { success: false, error: 'Unauthorized' }
  }

  // Use the safe transition RPC
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'transition_order_status',
    {
      p_order_id: orderId,
      p_new_status: 'RETURN_APPROVED',
      p_actor_type: 'admin',
      p_actor_id: user.id,
      p_remarks: adminNotes
    }
  )

  if (rpcError || !rpcResult?.success) {
    return { success: false, error: rpcError?.message || rpcResult?.error || 'Failed to approve return' }
  }

  // Update returns table
  const { error: updateError } = await supabase
    .from('returns')
    .update({ status: 'RETURN_APPROVED', admin_notes: adminNotes, updated_at: new Date().toISOString() })
    .eq('order_id', orderId)

  await logAudit(supabase, user.id, 'APPROVE_RETURN', 'Order', orderId, { status: 'RETURN_REQUESTED' }, { status: 'RETURN_APPROVED', adminNotes })
  
  revalidatePath('/uc-admin-portal/orders')
  revalidatePath('/account/orders')
  return { success: true }
}

export async function processRefund(orderId: string, amount: number, reason: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user || !user.email?.endsWith('@ucenterprises.com')) {
    return { success: false, error: 'Unauthorized' }
  }

  // Fetch order to get Razorpay Payment ID
  const { data: order } = await supabase.from('orders').select('razorpay_payment_id').eq('id', orderId).single()
  
  if (!order || !order.razorpay_payment_id) {
    return { success: false, error: 'Razorpay payment ID not found. Manual refund required.' }
  }

  let gatewayRefundId: string | null = null;
  
  try {
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_SECRET_KEY || process.env.RAZORPAY_KEY_SECRET!
    });
    
    const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: amount * 100, // amount in paise
      notes: { reason, orderId }
    });
    
    gatewayRefundId = refund.id;
  } catch (rzpErr: any) {
    console.error('Razorpay refund API error:', rzpErr)
    return { success: false, error: `Razorpay API Error: ${rzpErr.error?.description || rzpErr.message || 'Unknown error'}` }
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'transition_order_status',
    {
      p_order_id: orderId,
      p_new_status: 'REFUNDED',
      p_actor_type: 'admin',
      p_actor_id: user.id,
      p_remarks: `Refund Processed via API: ${reason}`
    }
  )

  if (rpcError || !rpcResult?.success) {
    return { success: false, error: rpcError?.message || rpcResult?.error || 'Failed to process refund in database' }
  }

  // Insert into refunds table
  const { error: insertError } = await supabase
    .from('refunds')
    .insert({
      order_id: orderId,
      amount: amount,
      status: 'REFUNDED',
      reason: reason,
      gateway_refund_id: gatewayRefundId
    })

  await logAudit(supabase, user.id, 'PROCESS_REFUND', 'Order', orderId, null, { amount, reason, gatewayRefundId })
  
  revalidatePath('/uc-admin-portal/orders')
  revalidatePath('/account/orders')
  return { success: true }
}

export async function adjustInventory(productId: string, adjustmentType: 'stock_quantity' | 'damaged_stock' | 'returned_stock', delta: number, reason: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user || !user.email?.endsWith('@ucenterprises.com')) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: product } = await supabase.from('products').select(adjustmentType).eq('id', productId).single()
  
  if (!product) return { success: false, error: 'Product not found' }

  const oldValue = (product as any)[adjustmentType]
  const newValue = oldValue + delta

  if (newValue < 0) return { success: false, error: 'Inventory cannot be negative' }

  const { error: updateError } = await supabase
    .from('products')
    .update({ [adjustmentType]: newValue })
    .eq('id', productId)

  if (updateError) return { success: false, error: 'Failed to adjust inventory' }

  await logAudit(supabase, user.id, 'ADJUST_INVENTORY', 'Product', productId, { [adjustmentType]: oldValue }, { [adjustmentType]: newValue, reason })

  revalidatePath('/uc-admin-portal/inventory')
  return { success: true }
}
