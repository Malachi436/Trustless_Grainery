// Types for Owner Dashboard Analytics

export type CropType = 'Maize' | 'Rice' | 'Soybeans' | 'Wheat' | 'Millet';
export type BatchSourceType = 'OWN_FARM' | 'SME' | 'SMALL_FARMER';
export type BuyerType = 'AGGREGATOR' | 'OFF_TAKER' | 'OPEN_MARKET';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'IN_KIND' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PENDING' | 'CONFIRMED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
export type ToolStatus = 'AVAILABLE' | 'ASSIGNED' | 'RETIRED';

// Executive Snapshot
export interface ExecutiveSnapshot {
  totalStockBags: number;
  stockBySource: {
    ownFarm: number;
    sme: number;
    smallFarmer: number;
  };
  activeBatches: number;
  pendingRequests: number;
  outstandingCreditTotal: number;
  toolsAssigned: number;
}

// Transaction
export interface Transaction {
  transaction_id: string;
  warehouse_id: string;
  request_id: string;
  crop: CropType;
  bag_quantity: number;
  transaction_date: string;
  buyer_type: BuyerType | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus | null;
  price_per_bag: number | null;
  total_amount: number | null;
  requested_by: string;
  approved_by: string | null;
  executed_by: string | null;
  payment_confirmed_by: string | null;
  requested_at: string;
  approved_at: string | null;
  executed_at: string | null;
  payment_confirmed_at: string | null;
  current_status: RequestStatus;
  requester_name?: string;
  approver_name?: string;
  executor_name?: string;
  confirmer_name?: string;
}

// Transaction Details (with batch breakdown)
export interface TransactionDetails extends Transaction {
  batch_breakdown: {
    batch_id: string;
    bags_allocated: number;
    crop_type: CropType;
    source_type: BatchSourceType;
    source_name: string | null;
  }[];
  event_timeline: {
    event_id: string;
    event_type: string;
    created_at: string;
    actor_id: string;
  }[];
}

// Batch Analytics
export interface BatchAnalytics {
  batch_id: string;
  warehouse_id: string;
  crop_type: CropType;
  source_type: BatchSourceType;
  source_name: string | null;
  initial_bags: number;
  remaining_bags: number;
  batch_date: string;
  days_old: number;
  batch_status: 'SOLD_OUT' | 'LOW_STOCK' | 'AGING' | 'ACTIVE';
}

// Outstanding Credit
export interface OutstandingCredit {
  transaction_id: string;
  warehouse_id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  crop: CropType;
  bag_quantity: number;
  total_amount: number | null;
  approved_at: string | null;
  executed_at: string | null;
  days_outstanding: number | null;
  approved_by_name: string | null;
  executed_by_name: string | null;
  total_paid?: number | null;
  remaining_balance?: number | null;
  last_payment_date?: string | null;
  last_payment_by_name?: string | null;
}

// Buyer Breakdown
export interface BuyerBreakdown {
  byBuyerType: {
    buyer_type: BuyerType;
    transaction_count: number;
    total_bags: number;
    total_revenue: number;
  }[];
  topBuyers: {
    buyer_name: string;
    buyer_type: BuyerType | null;
    transaction_count: number;
    total_bags: number;
    total_revenue: number;
  }[];
}

// Tool Dashboard
export interface ToolDashboard {
  id: string;
  tool_type: string;
  internal_tag: string;
  status: ToolStatus;
  assigned_to_attendant_id: string | null;
  attendant_name: string | null;
  days_held: number | null;
}

// Attendant Activity
export interface AttendantActivity {
  attendant_id: string;
  attendant_name: string;
  warehouse_id: string;
  requests_submitted: number;
  dispatches_executed: number;
  tools_currently_assigned: number;
  avg_hours_approval_to_execution: number | null;
}

// Warehouse (Multi-Owner)
export interface Warehouse {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_location: string;
  warehouse_status: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}
