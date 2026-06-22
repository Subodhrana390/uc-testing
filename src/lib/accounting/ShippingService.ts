import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { ShippingCharge } from "@/types/accounting";

export class ShippingService {
  /**
   * Log shipping costs and calculate profit.
   */
  public static async logShippingCost(
    orderId: string, 
    carrierName: string, 
    actualShippingCost: number, 
    chargedToCustomer: number, 
    trackingNumber?: string
  ): Promise<ShippingCharge> {
    const supabase = createServiceRoleClient();

    if (actualShippingCost < 0 || chargedToCustomer < 0) {
      throw new Error("Shipping costs cannot be negative");
    }

    const shippingGST = chargedToCustomer * (18 / 100);
    const shippingProfit = chargedToCustomer - actualShippingCost;

    const charge: Omit<ShippingCharge, 'id'> = {
      orderId,
      carrierName,
      trackingNumber,
      actualShippingCost,
      chargedToCustomer,
      shippingGST,
      shippingProfit,
      status: 'PENDING'
    };

    const { data, error } = await supabase
      .from('shipping_charges')
      .insert(charge)
      .select()
      .single();

    if (error) throw new Error(`Failed to log shipping charge: ${error.message}`);
    return data as ShippingCharge;
  }

  public static async updateShippingStatus(orderId: string, status: ShippingCharge['status']) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('shipping_charges')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update shipping status: ${error.message}`);
    return data as ShippingCharge;
  }
}
