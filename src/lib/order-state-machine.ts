export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURNED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "FAILED";

export type ActorType = "customer" | "admin" | "system" | "delivery_agent";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURN_APPROVED"],
  RETURN_APPROVED: ["RETURNED"],
  RETURNED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: []
};

export const ROLE_PERMISSIONS: Record<ActorType, OrderStatus[]> = {
  customer: ["CANCELLED"],
  delivery_agent: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  admin: [
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "RETURNED",
    "REFUND_PENDING",
    "REFUNDED",
    "FAILED"
  ],
  system: [
    "CONFIRMED",
    "CANCELLED",
    "FAILED",
    "REFUND_PENDING",
    "REFUNDED"
  ]
};

export function validateTransition(
  currentStatus: string,
  newStatus: string,
  actor: ActorType
): { isValid: boolean; reason?: string } {
  const cur = currentStatus.toUpperCase() as OrderStatus;
  const next = newStatus.toUpperCase() as OrderStatus;

  if (cur === next) {
    return { isValid: false, reason: `Status is already ${cur}` };
  }

  const allowed = ALLOWED_TRANSITIONS[cur];
  if (!allowed || !allowed.includes(next)) {
    return { 
      isValid: false, 
      reason: `Invalid status transition from ${cur} to ${next}` 
    };
  }

  const allowedStatusesForRole = ROLE_PERMISSIONS[actor];
  if (!allowedStatusesForRole || !allowedStatusesForRole.includes(next)) {
    return { 
      isValid: false, 
      reason: `Actor role "${actor}" is not authorized to transition order to status "${next}"` 
    };
  }

  // Customers can only cancel before shipping
  if (actor === "customer" && next === "CANCELLED") {
    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(cur)) {
      return { 
        isValid: false, 
        reason: `Customers cannot cancel orders after they have been shipped.` 
      };
    }
  }

  return { isValid: true };
}
