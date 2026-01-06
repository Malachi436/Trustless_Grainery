// Core types for Trustless Granary warehouse inventory system

export type UserRole = 'attendant' | 'owner' | 'field_agent';

export type WarehouseStatus = 'setup_in_progress' | 'pending_genesis' | 'active';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
  warehouseId: string;
}

export interface Warehouse {
  id: string;
  name: string;
  status: WarehouseStatus;
}

export interface AuthState {
  user: User | null;
  warehouse: Warehouse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type CropType = 'wheat' | 'rice' | 'maize' | 'sorghum' | 'barley' | 'millet' | 'soybeans';

// v2 Enums
export type BatchSourceType = 'OWN_FARM' | 'SME' | 'SMALL_FARMER';
export type BuyerType = 'AGGREGATOR' | 'OFF_TAKER' | 'OPEN_MARKET';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'IN_KIND' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PENDING' | 'CONFIRMED';
export type ToolStatus = 'AVAILABLE' | 'ASSIGNED' | 'RETIRED';

export interface StockItem {
  cropType: CropType;
  bagCount: number;
}

export type OutboundRequestStatus = 'pending' | 'approved' | 'rejected' | 'dispatched';

export interface OutboundRequest {
  id: string;
  cropType: CropType;
  bagCount: number;
  buyerName: string;
  buyerContact: string;
  status: OutboundRequestStatus;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  dispatchedAt?: string;
  requestedBy: string;
  approvedBy?: string;
  // v2 fields
  buyerType?: BuyerType;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  pricePerBag?: number;
  totalAmount?: number;
}

export interface InboundEntry {
  id: string;
  cropType: CropType;
  bagCount: number;
  source: string;
  photoUri: string;
  createdAt: string;
  createdBy: string;
  syncStatus: 'pending' | 'synced';
}

export interface DispatchExecution {
  id: string;
  requestId: string;
  photoUri: string;
  executedAt: string;
  executedBy: string;
}

export type AuditEventType =
  | 'genesis_inventory'
  | 'inbound'
  | 'outbound_request'
  | 'approval'
  | 'rejection'
  | 'dispatch'
  | 'payment_confirmed'
  | 'tool_assigned'
  | 'tool_returned';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  cropType?: CropType;
  bagCount?: number;
  actor: string;
  timestamp: string;
  photoUri?: string;
  details?: string;
}

export interface GenesisInventory {
  items: StockItem[];
  photos: string[];
  recordedAt: string;
  recordedBy: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Network state
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

// v2 Models
export interface Batch {
  id: string;
  warehouseId: string;
  cropType: CropType;
  sourceType: BatchSourceType;
  sourceName?: string;
  sourceLocation?: string;
  purchasePricePerBag?: number;
  initialBags: number;
  remainingBags: number;
  createdAt: string;
  createdBy: string;
}

export interface Tool {
  id: string;
  warehouseId: string;
  toolType: string;
  internalTag: string;
  status: ToolStatus;
  assignedTo?: string;
  createdAt: string;
}

export interface BatchAllocation {
  id: string;
  requestId: string;
  batchId: string;
  bags: number;
  createdAt: string;
}
