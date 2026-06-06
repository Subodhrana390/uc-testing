import { describe, expect, it } from "vitest";
import { validateTransition } from "./order-state-machine";

describe("Order Status State Machine Transitions", () => {
  describe("Valid Transition Rules", () => {
    it("should allow PENDING to transition to CONFIRMED, CANCELLED, FAILED", () => {
      expect(validateTransition("PENDING", "CONFIRMED", "admin").isValid).toBe(true);
      expect(validateTransition("PENDING", "CANCELLED", "customer").isValid).toBe(true);
      expect(validateTransition("PENDING", "FAILED", "admin").isValid).toBe(true);
    });

    it("should allow CONFIRMED to transition to PROCESSING, CANCELLED", () => {
      expect(validateTransition("CONFIRMED", "PROCESSING", "admin").isValid).toBe(true);
      expect(validateTransition("CONFIRMED", "CANCELLED", "customer").isValid).toBe(true);
    });

    it("should allow PROCESSING to transition to PACKED, CANCELLED", () => {
      expect(validateTransition("PROCESSING", "PACKED", "admin").isValid).toBe(true);
      expect(validateTransition("PROCESSING", "CANCELLED", "customer").isValid).toBe(true);
    });

    it("should allow PACKED to transition to SHIPPED", () => {
      expect(validateTransition("PACKED", "SHIPPED", "admin").isValid).toBe(true);
    });

    it("should allow SHIPPED to transition to OUT_FOR_DELIVERY", () => {
      expect(validateTransition("SHIPPED", "OUT_FOR_DELIVERY", "admin").isValid).toBe(true);
    });

    it("should allow OUT_FOR_DELIVERY to transition to DELIVERED, RETURNED", () => {
      expect(validateTransition("OUT_FOR_DELIVERY", "DELIVERED", "admin").isValid).toBe(true);
      expect(validateTransition("OUT_FOR_DELIVERY", "RETURNED", "admin").isValid).toBe(true);
    });

    it("should allow DELIVERED to transition to RETURN_REQUESTED", () => {
      expect(validateTransition("DELIVERED", "RETURN_REQUESTED", "admin").isValid).toBe(true);
    });

    it("should allow RETURN_REQUESTED to transition to RETURN_APPROVED", () => {
      expect(validateTransition("RETURN_REQUESTED", "RETURN_APPROVED", "admin").isValid).toBe(true);
    });

    it("should allow RETURN_APPROVED to transition to RETURNED", () => {
      expect(validateTransition("RETURN_APPROVED", "RETURNED", "admin").isValid).toBe(true);
    });

    it("should allow RETURNED to transition to REFUND_PENDING", () => {
      expect(validateTransition("RETURNED", "REFUND_PENDING", "admin").isValid).toBe(true);
    });

    it("should allow REFUND_PENDING to transition to REFUNDED", () => {
      expect(validateTransition("REFUND_PENDING", "REFUNDED", "admin").isValid).toBe(true);
    });
  });

  describe("Invalid Transitions", () => {
    it("should reject same-state transition", () => {
      const res = validateTransition("PENDING", "PENDING", "admin");
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain("already PENDING");
    });

    it("should reject transitions that bypass states", () => {
      const res = validateTransition("PENDING", "SHIPPED", "admin");
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain("Invalid status transition from PENDING to SHIPPED");
    });

    it("should reject illegal backward transitions", () => {
      const res = validateTransition("SHIPPED", "PENDING", "admin");
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain("Invalid status transition from SHIPPED to PENDING");
    });
  });

  describe("Role-based Permission Checks", () => {
    describe("Customer Permissions", () => {
      it("should permit customer to cancel order if PENDING, CONFIRMED or PROCESSING", () => {
        expect(validateTransition("PENDING", "CANCELLED", "customer").isValid).toBe(true);
        expect(validateTransition("CONFIRMED", "CANCELLED", "customer").isValid).toBe(true);
        expect(validateTransition("PROCESSING", "CANCELLED", "customer").isValid).toBe(true);
      });

      it("should reject customer cancellation if SHIPPED, OUT_FOR_DELIVERY or DELIVERED", () => {
        const res = validateTransition("SHIPPED", "CANCELLED", "customer");
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain("Invalid status transition from SHIPPED to CANCELLED");
      });

      it("should deny customer to update status to any other status", () => {
        const res = validateTransition("PENDING", "CONFIRMED", "customer");
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain("not authorized to transition order to status");
      });
    });

    describe("Delivery Agent Permissions", () => {
      it("should allow delivery agent to transition to delivery-related statuses", () => {
        expect(validateTransition("SHIPPED", "OUT_FOR_DELIVERY", "delivery_agent").isValid).toBe(true);
        expect(validateTransition("OUT_FOR_DELIVERY", "DELIVERED", "delivery_agent").isValid).toBe(true);
        expect(validateTransition("OUT_FOR_DELIVERY", "RETURNED", "delivery_agent").isValid).toBe(true);
      });

      it("should deny delivery agent from other status updates", () => {
        const res = validateTransition("PENDING", "CONFIRMED", "delivery_agent");
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain("not authorized to transition order to status");
      });
    });

    describe("Admin Permissions", () => {
      it("should allow admin to perform any valid transition", () => {
        expect(validateTransition("PENDING", "CONFIRMED", "admin").isValid).toBe(true);
        expect(validateTransition("CONFIRMED", "PROCESSING", "admin").isValid).toBe(true);
        expect(validateTransition("PROCESSING", "PACKED", "admin").isValid).toBe(true);
      });
    });

    describe("System Permissions", () => {
      it("should allow system to transition to allowed status list", () => {
        expect(validateTransition("PENDING", "CONFIRMED", "system").isValid).toBe(true);
        expect(validateTransition("PENDING", "CANCELLED", "system").isValid).toBe(true);
        expect(validateTransition("PENDING", "FAILED", "system").isValid).toBe(true);
        expect(validateTransition("RETURNED", "REFUND_PENDING", "system").isValid).toBe(true);
        expect(validateTransition("REFUND_PENDING", "REFUNDED", "system").isValid).toBe(true);
      });

      it("should block system from admin-only updates like processing, packed, shipped", () => {
        const res = validateTransition("CONFIRMED", "PROCESSING", "system");
        expect(res.isValid).toBe(false);
        expect(res.reason).toContain("not authorized to transition order to status");
      });
    });
  });
});
