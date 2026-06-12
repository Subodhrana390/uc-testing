/**
 * Generates a consistent, Flipkart-style Order ID based on the internal database ID and creation timestamp.
 * Format: OD + Timestamp (13 digits) + Unique Suffix (5 digits)
 */
export function getDisplayOrderId(internalId: string, createdAt: string) {
  if (!internalId || !createdAt) return "PENDING";
  
  const prefix = "OD";
  const timestamp = new Date(createdAt).getTime().toString();
  
  // Create a stable 5-digit suffix from the UUID
  // Taking the first 8 chars of UUID, converting to int, and getting last 5 digits
  const suffix = parseInt(internalId.split('-')[0], 16).toString().slice(-5).padStart(5, '0');
  
  return `${prefix}${timestamp}${suffix}`;
}

/**
 * Checks if an order is within the 7-day return period since it was delivered.
 * Returns an object with:
 * - isReturnable: boolean
 * - deliveryDate: Date | null
 * - daysRemaining: number (if delivered, remaining days to return)
 */
export function getReturnWindowInfo(order: any) {
  if (order.status?.toLowerCase() !== "delivered") {
    return { isReturnable: false, deliveryDate: null, daysRemaining: 0 };
  }

  // Find the delivered status timestamp from status history
  const deliveredHistory = order.order_status_history?.find(
    (h: any) => h.new_status?.toUpperCase() === "DELIVERED"
  );

  // Fallback to updated_at or created_at if status history is missing
  const deliveryDate = deliveredHistory 
    ? new Date(deliveredHistory.created_at) 
    : new Date(order.updated_at || order.created_at);

  const now = new Date();
  const diffTime = now.getTime() - deliveryDate.getTime();
  const returnWindowMs = 7 * 24 * 60 * 60 * 1000;
  
  const isReturnable = diffTime <= returnWindowMs;
  const daysRemaining = Math.max(0, Math.ceil((returnWindowMs - diffTime) / (1000 * 60 * 60 * 24)));

  return { isReturnable, deliveryDate, daysRemaining };
}
