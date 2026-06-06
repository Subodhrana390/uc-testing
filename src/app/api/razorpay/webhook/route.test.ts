import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import crypto from "crypto";

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/utils/supabase/service-role", () => {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockImplementation((...args) => {
    mockInsert(...args);
    return chain;
  });
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockImplementation(() => mockSingle());
  chain.maybeSingle = vi.fn().mockImplementation(() => mockMaybeSingle());
  chain.then = vi.fn().mockImplementation((resolve) => resolve({ error: null }));

  return {
    createServiceRoleClient: () => chain
  };
});

describe("Razorpay Webhook API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = "testsecret";
  });

  it("should fail if signature is not present", async () => {
    const req = new Request("http://localhost:3000/api/razorpay/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No signature provided");
  });

  it("should fail if signature is invalid", async () => {
    const payload = JSON.stringify({ event: "order.paid" });
    const req = new Request("http://localhost:3000/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": "wrongsignature",
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid signature");
  });

  it("should process order.paid successfully", async () => {
    const payload = {
      event: "order.paid",
      payload: {
        order: {
          entity: {
            id: "order_123",
            notes: {
              orderId: "supabase_order_uuid"
            }
          }
        },
        payment: {
          entity: {
            id: "pay_123",
            notes: {
              orderId: "supabase_order_uuid"
            }
          }
        }
      }
    };
    
    const bodyStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", "testsecret")
      .update(bodyStr)
      .digest("hex");

    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Pending", payment_status: "Unpaid" },
      error: null
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Placed", payment_status: "Paid" },
      error: null
    });

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    const req = new Request("http://localhost:3000/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(mockInsert).toHaveBeenCalledWith({
      order_id: "supabase_order_uuid",
      amount: 1500,
      currency: "INR",
      status: "completed",
      payment_method: "ONLINE",
      transaction_id: "pay_123"
    });
  });

  it("should process payment.failed successfully", async () => {
    const payload = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_123",
            order_id: "order_123",
            notes: {
              orderId: "supabase_order_uuid"
            }
          }
        }
      }
    };
    
    const bodyStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", "testsecret")
      .update(bodyStr)
      .digest("hex");

    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Pending", payment_status: "Unpaid" },
      error: null
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Pending", payment_status: "Failed" },
      error: null
    });

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    const req = new Request("http://localhost:3000/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(mockInsert).toHaveBeenCalledWith({
      order_id: "supabase_order_uuid",
      amount: 1500,
      currency: "INR",
      status: "failed",
      payment_method: "ONLINE",
      transaction_id: "pay_123"
    });
  });

  it("should process refund.processed successfully", async () => {
    const payload = {
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_123",
            payment_id: "pay_123",
            amount: 150000 // 1500.00 in paise
          }
        }
      }
    };
    
    const bodyStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", "testsecret")
      .update(bodyStr)
      .digest("hex");

    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Placed", payment_status: "Paid", razorpay_payment_id: "pay_123" },
      error: null
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: "supabase_order_uuid", total_amount: "1500.00", status: "Placed", payment_status: "Refunded" },
      error: null
    });

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    const req = new Request("http://localhost:3000/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(mockInsert).toHaveBeenCalledWith({
      order_id: "supabase_order_uuid",
      amount: 1500,
      currency: "INR",
      status: "refunded",
      payment_method: "ONLINE",
      transaction_id: "rfnd_123"
    });
  });
});
