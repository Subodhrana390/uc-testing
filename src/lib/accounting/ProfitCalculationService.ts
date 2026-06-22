import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { OrderItemProfitBreakdown, OrderProfitBreakdown, ProfitLossReport } from "@/types/finance";

export class ProfitCalculationService {
  /**
   * Calculates profit margins for an individual order.
   */
  public static async calculateOrderProfit(orderId: string): Promise<OrderProfitBreakdown> {
    const supabase = createServiceRoleClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        payments (*),
        shipping_charges (*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error(`Order not found: ${error?.message}`);

    let totalRevenue = 0;
    let totalCogs = 0;

    for (const item of order.order_items) {
      const qty = item.quantity;
      const sellingPrice = parseFloat(item.price) || 0;
      // cost_price is already snapshotted in order_items by a previous migration
      const costPrice = parseFloat(item.cost_price) || 0; 

      totalRevenue += (sellingPrice * qty);
      totalCogs += (costPrice * qty);
    }

    const shippingCollected = parseFloat(order.shipping_amount) || 0;
    
    // Check actual shipping cost if logged in shipping_charges
    let shippingExpense = 0;
    if (order.shipping_charges && order.shipping_charges.length > 0) {
      shippingExpense = parseFloat(order.shipping_charges[0].actual_shipping_cost) || 0;
    }

    // Estimate Gateway Fee (Razorpay typically charges 2% on total amount processed)
    // If order was COD, payment gateway fee is 0
    let paymentGatewayFee = 0;
    if (order.payment_method === 'ONLINE' && order.payments && order.payments.length > 0) {
      const txAmount = parseFloat(order.payments[0].amount) || 0;
      paymentGatewayFee = txAmount * 0.02; // 2% gateway fee
    }

    const discount = parseFloat(order.discount_amount) || 0;

    const netProfit = totalRevenue - totalCogs - shippingExpense - paymentGatewayFee - discount;

    return {
      orderId,
      revenue: totalRevenue,
      cogs: totalCogs,
      shippingCollected,
      shippingExpense,
      paymentGatewayFee,
      discount,
      netProfit
    };
  }

  /**
   * Generates a P&L statement for a specific month and year.
   */
  public static async generateProfitAndLossReport(month: number, year: number): Promise<ProfitLossReport> {
    const supabase = createServiceRoleClient();

    // In a real application, you would query based on timestamps.
    // For simplicity, we assume we fetch all orders within the given month.
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, shipping_amount, discount_amount, payment_method, order_items(quantity, price, cost_price)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['DELIVERED', 'COMPLETED', 'PLACED']); // Only successful orders

    if (error) throw new Error(`Failed to fetch orders for P&L: ${error.message}`);

    // We also need actual shipping costs for the month
    const { data: shippingCharges } = await supabase
      .from('shipping_charges')
      .select('actual_shipping_cost, order_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const shippingCostMap = new Map();
    shippingCharges?.forEach(sc => shippingCostMap.set(sc.order_id, parseFloat(sc.actual_shipping_cost)));

    let productRevenue = 0;
    let shippingRevenue = 0;
    let cogs = 0;
    let shippingExpense = 0;
    let paymentGatewayCharges = 0;
    let discounts = 0;

    for (const order of orders) {
      shippingRevenue += parseFloat(order.shipping_amount) || 0;
      discounts += parseFloat(order.discount_amount) || 0;

      // Product Revenue & COGS
      for (const item of order.order_items) {
        const qty = item.quantity;
        productRevenue += (parseFloat(item.price) * qty);
        cogs += (parseFloat(item.cost_price) * qty);
      }

      // Shipping Expense
      if (shippingCostMap.has(order.id)) {
        shippingExpense += shippingCostMap.get(order.id);
      }

      // Gateway Fee
      if (order.payment_method === 'ONLINE') {
        paymentGatewayCharges += (parseFloat(order.total_amount) * 0.02);
      }
    }

    const totalIncome = productRevenue + shippingRevenue;
    const totalExpenses = cogs + shippingExpense + paymentGatewayCharges + discounts;

    const grossProfit = productRevenue - cogs;
    const operatingProfit = grossProfit - shippingExpense - paymentGatewayCharges - discounts + shippingRevenue;

    return {
      period: `Month ${month}, ${year}`,
      income: {
        productRevenue,
        shippingRevenue,
        totalIncome
      },
      expenses: {
        cogs,
        shippingExpense,
        paymentGatewayCharges,
        refunds: 0, // Placeholder
        marketingExpense: 0, // Requires a marketing expense table
        operationalExpense: 0, // Requires an op expense table
        totalExpenses
      },
      grossProfit,
      operatingProfit,
      netProfit: operatingProfit // Before tax
    };
  }
}
