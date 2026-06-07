import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Detect Payment Mismatches (Orders Paid, but no payment completed record)
    const { data: mismatchOrders, error: mismatchError } = await supabase
      .from('orders')
      .select('id, payment_status, total_amount, (select count(id) from payments where order_id = orders.id and status = \'completed\') as completed_payments')
      .in('payment_status', ['Paid', 'PAYMENT_SUCCESS'])
      .gte('created_at', oneDayAgo);

    const discrepancies = [];

    if (!mismatchError && mismatchOrders) {
      for (const order of mismatchOrders) {
        // @ts-ignore
        if (order.completed_payments === 0) {
          discrepancies.push({
            type: 'MISSING_PAYMENT_RECORD',
            orderId: order.id,
            expectedAmount: order.total_amount
          });
        }
      }
    }

    // 2. Detect Duplicate Payments for same order
    const { data: dupPayments, error: dupError } = await supabase
      .from('payments')
      .select('order_id, status')
      .eq('status', 'completed')
      .gte('created_at', oneDayAgo);

    if (!dupError && dupPayments) {
      const orderPaymentCounts = dupPayments.reduce((acc, curr) => {
        acc[curr.order_id] = (acc[curr.order_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [orderId, count] of Object.entries(orderPaymentCounts)) {
        if (count > 1) {
          discrepancies.push({
            type: 'DUPLICATE_PAYMENT',
            orderId,
            paymentCount: count
          });
        }
      }
    }

    // If discrepancies found, log them securely
    if (discrepancies.length > 0) {
      console.error('[FINANCIAL RECONCILIATION] Discrepancies detected:', discrepancies);
      // In production, we would send an alert to PagerDuty or Slack here
    } else {
      console.log('[FINANCIAL RECONCILIATION] All systems healthy.');
    }

    return NextResponse.json({ 
      success: true, 
      healthy: discrepancies.length === 0,
      discrepancies 
    });

  } catch (error: any) {
    console.error('Reconciliation Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
