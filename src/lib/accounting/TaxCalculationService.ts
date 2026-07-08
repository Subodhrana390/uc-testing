import { ProductTaxConfig } from "@/types/accounting";

interface TaxCalculationInput {
  sellerState: string;
  customerState: string;
  products: {
    price: number;
    quantity: number;
    taxConfig: ProductTaxConfig;
  }[];
  shippingCost: number;
  discountAmount?: number;
}

export class TaxCalculationService {
  /**
   * Determine if the sale is intra-state (same state) or inter-state (different state).
   * We normalize state strings to avoid case sensitivity issues.
   */
  private static isIntraState(sellerState: string, customerState: string): boolean {
    const sState = sellerState.toLowerCase().trim();
    const cState = customerState.toLowerCase().trim();
    
    // Custom handling for 'Punjab' as per prior logic (PB, etc.)
    if (sState === "punjab") {
      return cState.includes("punjab") || 
             cState.includes("pb") || 
             /14[0-9]{4}/.test(cState) || 
             /15[0-2][0-9]{3}/.test(cState) || 
             /160[0-9]{3}/.test(cState);
    }
    
    return sState === cState;
  }

  public static calculateTax(input: TaxCalculationInput) {
    const { sellerState, customerState, products, shippingCost, discountAmount = 0 } = input;
    
    // Validate shipping cost
    if (shippingCost < 0) throw new Error("Shipping cost cannot be negative");

    const intraState = this.isIntraState(sellerState, customerState);
    
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let productGstTotal = 0;

    // Process each product
    for (const item of products) {
      if (![0, 5, 12, 18, 28].includes(item.taxConfig.gstRate)) {
        throw new Error(`Invalid GST Rate: ${item.taxConfig.gstRate}`);
      }

      const rawTotal = item.price * item.quantity;
      let basePrice = rawTotal;
      let taxAmount = 0;

      if (item.taxConfig.taxable && item.taxConfig.gstRate > 0) {
        if (item.taxConfig.taxInclusive) {
          basePrice = rawTotal / (1 + item.taxConfig.gstRate / 100);
          taxAmount = rawTotal - basePrice;
        } else {
          taxAmount = rawTotal * (item.taxConfig.gstRate / 100);
        }
      }

      subtotal += basePrice;
      productGstTotal += taxAmount;

      if (intraState) {
        totalCgst += taxAmount / 2;
        totalSgst += taxAmount / 2;
      } else {
        totalIgst += taxAmount;
      }
    }

    // Apply discount equally to taxable amount (simplified logic)
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    // If there is a discount, proportionally reduce the GST (optional depending on strict Indian accounting rules, 
    // usually discount reduces taxable value which reduces GST)
    let finalCgst = totalCgst;
    let finalSgst = totalSgst;
    let finalIgst = totalIgst;
    
    if (discountAmount > 0 && subtotal > 0) {
      const discountRatio = taxableAmount / subtotal;
      finalCgst = totalCgst * discountRatio;
      finalSgst = totalSgst * discountRatio;
      finalIgst = totalIgst * discountRatio;
      productGstTotal = productGstTotal * discountRatio;
    }

    // Shipping GST (Fixed at 18% for courier services in India)
    const shippingGST = shippingCost * (18 / 100);
    
    if (intraState) {
      finalCgst += shippingGST / 2;
      finalSgst += shippingGST / 2;
    } else {
      finalIgst += shippingGST;
    }

    const grandTotal = taxableAmount + productGstTotal + shippingCost + shippingGST;

    return {
      itemSubtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgstAmount: Number(finalCgst.toFixed(2)),
      sgstAmount: Number(finalSgst.toFixed(2)),
      igstAmount: Number(finalIgst.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      shippingTaxAmount: Number(shippingGST.toFixed(2)),
      totalTaxAmount: Number((productGstTotal + shippingGST).toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }
}
