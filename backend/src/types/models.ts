import { EventType, UserRole, WarehouseStatus, RequestStatus, CropType } from './enums';

/**
 * Core Event Structure - The Source of Truth
 * Append-only, immutable, server-authoritative
 */
export interface Event {
  event_id: string; // UUID
  warehouse_id: string;
  event_type: EventType;
  actor_id: string; // User who created the event
  payload: EventPayload;
  created_at: Date; // Server timestamp (authoritative)
  sequence_number: number; // Monotonic per warehouse
}

/**
 * Event Payloads - Type-safe per event type
 */
export type EventPayload =
  | GenesisInventoryPayload
  | StockInboundPayload
  | OutboundRequestedPayload
  | OutboundApprovedPayload
  | OutboundRejectedPayload
  | DispatchExecutedPayload;

export interface GenesisInventoryPayload {
  crop: CropType;
  bag_quantity: number;
  photo_urls: string[]; // Mandatory
  notes?: string;
  confirmed_by_owner?: string; // Owner user_id
}

export interface StockInboundPayload {
  crop: CropType;
  bag_quantity: number;
  source: string; // Farm/location
  photo_urls: string[]; // Mandatory
  notes?: string;
  local_timestamp?: string; // Client timestamp (informational)
}

export interface OutboundRequestedPayload {
  request_id: string; // UUID
  crop: CropType;
  bag_quantity: number;
  buyer_name: string;
  buyer_phone: string;
  notes?: string;
}

export interface OutboundApprovedPayload {
  request_id: string;
  approved_by: string; // Owner user_id
  notes?: string;
}

export interface OutboundRejectedPayload {
  request_id: string;
  rejected_by: string; // Owner user_id
  reason?: string;
}

export interface DispatchExecutedPayload {
  request_id: string;
  executed_by: string; // Attendant user_id
  photo_urls: string[]; // Mandatory
  notes?: string;
}

/**
 * User Model
 */
export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  hashed_pin: string;
  warehouse_id: string | null; // Null for PLATFORM_ADMIN
  created_at: Date;
  updated_at: Date;
}

/**
 * Warehouse Model
 */
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  status: WarehouseStatus;
  owner_id: string; // User ID with OWNER role
  created_at: Date;
  updated_at: Date;
}

/**
 * Attendant-Warehouse Link
 */
export interface AttendantWarehouse {
  attendant_id: string;
  warehouse_id: string;
  assigned_at: Date;
}

/**
 * Request Projection (Derived, not authoritative)
 * Rebuildable from events
 */
export interface RequestProjection {
  request_id: string;
  warehouse_id: string;
  crop: CropType;
  bag_quantity: number;
  buyer_name: string;
  buyer_phone: string;
  status: RequestStatus;
  requested_by: string;
  requested_at: Date;
  approved_by?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_at?: Date;
  executed_by?: string;
  executed_at?: Date;
  event_ids: string[]; // References to events
}

/**
 * Stock Projection (Derived, not authoritative)
 * Rebuildable from events using the formula:
 * CurrentBags = SUM(GENESIS) + SUM(INBOUND) - SUM(DISPATCH_EXECUTED)
 */
export interface StockProjection {
  warehouse_id: string;
  crop: CropType;
  bag_count: number;
  last_updated_at: Date;
  last_event_sequence: number;
}

/**
 * JWT Token Payload
 */
export interface TokenPayload {
  user_id: string;
  role: UserRole;
  warehouse_id: string | null;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
