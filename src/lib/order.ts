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
