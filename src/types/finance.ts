export interface PurchaseOrderItem {
  id?: string;
  purchaseOrderId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseOrder {
  id?: string;
  supplierName: string;
  totalCost: number;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  receivedDate?: string;
  items?: PurchaseOrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItemProfitBreakdown {
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  profitMargin: number; // percentage
}

export interface OrderProfitBreakdown {
  orderId: string;
  revenue: number;
  cogs: number;
  shippingCollected: number;
  shippingExpense: number;
  paymentGatewayFee: number;
  discount: number;
  netProfit: number;
}

export interface ProfitLossReport {
  period: string; // 'Daily', 'Weekly', 'Monthly', 'Yearly'
  income: {
    productRevenue: number;
    shippingRevenue: number;
    totalIncome: number;
  };
  expenses: {
    cogs: number;
    shippingExpense: number;
    paymentGatewayCharges: number;
    refunds: number;
    marketingExpense: number;
    operationalExpense: number;
    totalExpenses: number;
  };
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
}
