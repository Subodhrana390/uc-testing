import { describe, it, expect } from 'vitest';
import { TaxCalculationService } from '@/lib/accounting/TaxCalculationService';

describe('TaxCalculationService', () => {
  it('should split GST into CGST and SGST for intra-state (Punjab to Punjab)', () => {
    const input = {
      sellerState: 'Punjab',
      customerState: 'Punjab',
      products: [
        {
          price: 1000,
          quantity: 2,
          taxConfig: {
            productId: 'prod-1',
            gstRate: 18 as const,
            hsnCode: '1234',
            taxInclusive: false,
            taxable: true
          }
        }
      ],
      shippingCost: 100
    };

    const breakdown = TaxCalculationService.calculateTax(input);

    expect(breakdown.itemSubtotal).toBe(2000);
    // CGST = 9%, SGST = 9% of 2000 => 180 + 180
    // Shipping = 100, Shipping Tax = 18 => CGST 9, SGST 9
    // Taxable Amount = 2000 + 100 = 2100
    expect(breakdown.taxableAmount).toBe(2000); // Wait, shipping is separate
    expect(breakdown.cgstAmount).toBe(180 + 9);
    expect(breakdown.sgstAmount).toBe(180 + 9);
    expect(breakdown.igstAmount).toBe(0);
    expect(breakdown.shippingCost).toBe(100);
    expect(breakdown.shippingTaxAmount).toBe(18);
    expect(breakdown.totalTaxAmount).toBe(360 + 18);
    expect(breakdown.grandTotal).toBe(2000 + 100 + 360 + 18);
  });

  it('should apply full IGST for inter-state (Punjab to Delhi)', () => {
    const input = {
      sellerState: 'Punjab',
      customerState: 'Delhi',
      products: [
        {
          price: 1000,
          quantity: 2,
          taxConfig: {
            productId: 'prod-1',
            gstRate: 18 as const,
            hsnCode: '1234',
            taxInclusive: false,
            taxable: true
          }
        }
      ],
      shippingCost: 100
    };

    const breakdown = TaxCalculationService.calculateTax(input);

    expect(breakdown.cgstAmount).toBe(0);
    expect(breakdown.sgstAmount).toBe(0);
    expect(breakdown.igstAmount).toBe(360 + 18); // 360 for items + 18 for shipping
    expect(breakdown.totalTaxAmount).toBe(378);
  });
});
