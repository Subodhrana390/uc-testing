export interface ProductTaxConfig {
  productId: string;
  gstRate: 0 | 5 | 12 | 18 | 28;
  hsnCode: string;
  taxInclusive: boolean;
  taxable: boolean;
}

export interface OrderTaxBreakdown {
  orderId: string;
  itemSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  
  shippingCost: number;
  shippingTaxAmount: number;
  
  totalTaxAmount: number;
  grandTotal: number;
}

export interface ShippingCharge {
  id?: string;
  orderId: string;
  carrierName: string;
  trackingNumber?: string;
  
  actualShippingCost: number;
  chargedToCustomer: number;
  
  shippingGST: number;
  shippingProfit: number;
  
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED';
  createdAt?: string;
  updatedAt?: string;
}

export interface GSTLedgerEntry {
  id?: string;
  orderId: string;
  invoiceNumber: string;
  
  taxableValue: number;
  
  cgst: number;
  sgst: number;
  igst: number;
  
  shippingTax: number;
  totalTaxCollected: number;
  
  month: number;
  year: number;
  
  createdAt?: string;
}

export interface GSTReportResult {
  taxableSales: number;
  cgstCollected: number;
  sgstCollected: number;
  igstCollected: number;
  shippingGST: number;
  totalGSTLiability: number;
  netRevenue: number;
}

export interface AccountingEntry {
  id?: string;
  orderId: string;
  type: 'REVENUE' | 'GST_PAYABLE' | 'SHIPPING_REVENUE';
  amount: number;
  description: string;
  createdAt?: string;
}
