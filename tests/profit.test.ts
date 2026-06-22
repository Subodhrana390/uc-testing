import { describe, it, expect, vi } from 'vitest';
import { ProfitCalculationService } from '@/lib/accounting/ProfitCalculationService';

// Mock the Supabase client
vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'test-order-1',
          shipping_amount: '50',
          discount_amount: '10',
          payment_method: 'ONLINE',
          order_items: [
            { quantity: 2, price: '100', cost_price: '60' }, // Rev: 200, COGS: 120
            { quantity: 1, price: '50', cost_price: '30' }   // Rev: 50, COGS: 30
          ],
          payments: [
            { amount: '300' } // 2% fee = 6
          ],
          shipping_charges: [
            { actual_shipping_cost: '40' }
          ]
        },
        error: null
      })
    }))
  })
}));

describe('ProfitCalculationService', () => {
  it('should calculate accurate profit for an order', async () => {
    const breakdown = await ProfitCalculationService.calculateOrderProfit('test-order-1');
    
    // Revenue: 200 + 50 = 250
    expect(breakdown.revenue).toBe(250);
    
    // COGS: 120 + 30 = 150
    expect(breakdown.cogs).toBe(150);
    
    // Shipping Expense: 40
    expect(breakdown.shippingExpense).toBe(40);
    
    // Gateway Fee: 2% of 300 = 6
    expect(breakdown.paymentGatewayFee).toBe(6);
    
    // Discount: 10
    expect(breakdown.discount).toBe(10);
    
    // Net Profit: 250 (Rev) - 150 (COGS) - 40 (ShippingExp) - 6 (Fee) - 10 (Discount) = 44
    expect(breakdown.netProfit).toBe(44);
  });
});
