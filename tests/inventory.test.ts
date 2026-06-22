import { describe, it, expect, vi } from 'vitest';
import { InventoryValuationService } from '@/lib/accounting/InventoryValuationService';

// We need to capture the updated average_cost_price to verify the WAC formula
let capturedProductUpdates: any = {};

vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        if (table === 'purchase_orders') {
          return Promise.resolve({
            data: {
              id: 'po-1',
              status: 'PENDING',
              purchase_order_items: [
                { product_id: 'prod-1', quantity: 100, unit_cost: 15 }
              ]
            },
            error: null
          });
        }
        if (table === 'products') {
          return Promise.resolve({
            data: {
              stock_quantity: 50,
              average_cost_price: 10 // Old cost
            },
            error: null
          });
        }
      }),
      update: vi.fn((payload: any) => {
        if (table === 'products') {
          capturedProductUpdates = payload;
        }
        return {
          eq: vi.fn().mockResolvedValue({ error: null })
        };
      }),
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  })
}));

describe('InventoryValuationService', () => {
  it('should calculate the Weighted Average Cost correctly on purchase receipt', async () => {
    await InventoryValuationService.receivePurchaseOrder('po-1');
    
    // Formula: (OldQty * OldCost + NewQty * NewCost) / TotalQty
    // (50 * 10 + 100 * 15) / 150
    // (500 + 1500) / 150 = 2000 / 150 = 13.333...
    
    expect(capturedProductUpdates.stock_quantity).toBe(150);
    expect(capturedProductUpdates.average_cost_price).toBeCloseTo(13.333, 2);
  });
});
