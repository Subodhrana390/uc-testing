import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: () => ({
    has: () => false,
    get: () => null,
  }),
}));

import { POST } from "./route";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

// Mock Supabase Server Client
vi.mock("@/utils/supabase/server", () => {
  const chain: any = {};
  chain.auth = {
    getUser: () => mockGetUser()
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockImplementation(() => mockMaybeSingle());
  chain.single = vi.fn().mockImplementation(() => mockSingle());
  chain.update = vi.fn().mockImplementation((...args) => {
    mockUpdate(...args);
    return chain;
  });
  chain.rpc = vi.fn().mockImplementation((...args) => mockRpc(...args));
  
  return {
    createClient: () => chain
  };
});

// Mock Supabase Service Role Client
vi.mock("@/utils/supabase/service-role", () => {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue({ data: null, error: null });
  chain.single = vi.fn().mockImplementation(() => mockSingle());
  chain.update = vi.fn().mockReturnValue(chain);
  chain.rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
  chain.insert = vi.fn().mockImplementation((...args) => {
    mockInsert(...args);
    return chain;
  });
  chain.then = vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null }));
  
  return {
    createServiceRoleClient: () => chain
  };
});

// Mock Email and Invoice helpers
vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue({ success: true }),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("@/lib/invoice", () => ({
  generateInvoicePDF: vi.fn().mockResolvedValue({
    output: () => "datauristring,mock_pdf_base64"
  })
}));

describe("Order Status API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("Auth failed") });

    const req = new Request("http://localhost:3000/api/orders/status", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord_123", status: "CONFIRMED" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should invoke transition_order_status with correct parameters for customer", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "usr_customer" } }, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { role: "customer" }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: "ord_123", customer_name: "John Doe", customer_email: "john@example.com", payment_status: "Unpaid", user_id: "usr_customer", status: "PENDING" },
      error: null
    });

    const req = new Request("http://localhost:3000/api/orders/status", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord_123", status: "CANCELLED", remarks: "Customer cancel request" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockRpc).toHaveBeenCalledWith("transition_order_status", {
      p_order_id: "ord_123",
      p_new_status: "CANCELLED",
      p_actor_type: "customer",
      p_actor_id: "usr_customer",
      p_remarks: "Customer cancel request"
    });
  });

  it("should return 400 if state machine transition is rejected by RPC", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "usr_customer" } }, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { role: "customer" }, error: null });
    mockSingle.mockResolvedValue({
      data: { id: "ord_123", customer_name: "John Doe", customer_email: "john@example.com", payment_status: "Unpaid", user_id: "usr_customer", status: "PENDING" },
      error: null
    });
    mockRpc.mockResolvedValueOnce({ data: { success: false, error: "Invalid status transition" }, error: null });

    const req = new Request("http://localhost:3000/api/orders/status", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord_123", status: "SHIPPED" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid status transition");
  });

  it("should record failed payments in payments table", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "usr_admin" } }, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null });
    mockSingle
      .mockResolvedValueOnce({
        data: { id: "ord_123", total_amount: "1500.00", status: "PENDING", payment_status: "Unpaid", user_id: "usr_customer" },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: "ord_123", total_amount: "1500.00", status: "CANCELLED", payment_status: "Failed", user_id: "usr_customer" },
        error: null
      });
    mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    const req = new Request("http://localhost:3000/api/orders/status", {
      method: "POST",
      body: JSON.stringify({ orderId: "ord_123", paymentStatus: "Failed" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockInsert).toHaveBeenCalledWith({
      order_id: "ord_123",
      amount: 1500,
      currency: "INR",
      status: "failed",
      payment_method: "ONLINE",
      transaction_id: expect.any(String),
    });
  });
});

