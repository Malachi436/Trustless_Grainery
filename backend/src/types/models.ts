import { EventType, UserRole, WarehouseStatus, RequestStatus, CropType, BatchSourceType, BuyerType, PaymentMethod, PaymentStatus, ToolStatus, RecoveryStatus, FieldAgentStatus, FarmerStatus, ServiceType } from './enums';

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
 * Extended with v2 payloads + Outgrower v3 payloads
 */
export type EventPayload =
  | GenesisInventoryPayload
  | StockInboundPayload
  | OutboundRequestedPayload
  | OutboundApprovedPayload
  | OutboundRejectedPayload
  | DispatchExecutedPayload
  | PaymentConfirmedPayload
  | ToolAssignedPayload
  | ToolReturnedPayload
  | ServiceRecordedPayload
  | HarvestCompletedPayload // DEPRECATED - DO NOT USE
  | ExpectedRecoveryDateUpdatedPayload
  | RecoveryInboundRecordedPayload
  | AggregatedInboundRecordedPayload;

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
  buyer_name: string; // Optional for attendant requests (empty string)
  buyer_phone: string; // Optional for attendant requests (empty string)
  notes?: string;
}

export interface OutboundApprovedPayload {
  request_id: string;
  approved_by: string; // Owner user_id
  notes?: string;
  // v2 fields (backward compatible - all optional)
  batch_breakdown?: Array<{
    batch_id: string;
    bags: number;
  }>;
  buyer_type?: BuyerType;
  buyer_name_final?: string; // Final buyer name (owner-provided)
  buyer_phone_final?: string; // Final buyer phone (owner-provided)
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  price_per_bag?: number;
  total_amount?: number;
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
 * Payment Confirmed Payload (New Event)
 */
export interface PaymentConfirmedPayload {
  request_id: string; // Links to outbound request
  confirmed_by: string; // Attendant user_id
  photo_urls?: string[]; // Optional proof of payment
  notes?: string;
}

/**
 * Tool Assigned Payload (New Event)
 */
export interface ToolAssignedPayload {
  tool_id: string;
  assigned_to: string; // Attendant user_id
  assigned_by: string; // Owner user_id
  notes?: string;
}

/**
 * Tool Returned Payload (New Event)
 */
export interface ToolReturnedPayload {
  tool_id: string;
  returned_by: string; // Attendant user_id
  condition_notes?: string;
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

/**
 * Batch Model (New)
 */
export interface Batch {
  id: string;
  warehouse_id: string;
  crop_type: CropType;
  source_type: BatchSourceType;
  source_name: string | null;
  source_location: string | null;
  purchase_price_per_bag: number | null;
  initial_bags: number;
  remaining_bags: number; // Derived from events
  created_at: Date;
  created_by: string;
}

/**
 * Tool Model (New)
 */
export interface Tool {
  id: string;
  warehouse_id: string;
  tool_type: string;
  internal_tag: string; // e.g., "HOE-001"
  status: ToolStatus;
  assigned_to_attendant_id: string | null;
  created_at: Date;
}

/**
 * Batch Allocation (Projection)
 */
export interface BatchAllocation {
  id: string;
  request_id: string;
  batch_id: string;
  bags_allocated: number;
  created_at: Date;
}

// ============================================
// OUTGROWER / FIELD AGENT PAYLOADS (v3)
// ============================================

export interface ServiceRecordedPayload {
  service_record_id: string; // UUID
  farmer_id: string; // UUID
  field_agent_id: string; // UUID
  service_types: ServiceType[];
  land_services?: Array<{
    service_type: ServiceType;
    date: string; // ISO date
    notes?: string;
  }>;
  land_size_acres?: number;
  fertilizer_type?: string;
  fertilizer_quantity_kg?: number;
  pesticide_type?: string;
  pesticide_quantity_liters?: number;
  expected_bags: number;
  expected_recovery_date?: string; // ISO date - when recovery is expected
}

/**
 * DEPRECATED: This event type is no longer used per authoritative spec.
 * System uses expected_recovery_date updates instead of harvest completion marking.
 */
export interface HarvestCompletedPayload {
  service_record_id: string; // UUID
  farmer_id: string; // UUID
  field_agent_id: string; // UUID
  harvest_completed_by: string; // Field Agent user_id
  notes?: string;
}

/**
 * NEW: Field Agent updates expected recovery date when delayed
 */
export interface ExpectedRecoveryDateUpdatedPayload {
  service_record_id: string; // UUID
  farmer_id: string; // UUID
  field_agent_id: string; // UUID
  old_date: string; // ISO date
  new_date: string; // ISO date
  reason: string; // Required - why the date changed
  updated_by: string; // Field Agent user_id
}

export interface RecoveryInboundRecordedPayload {
  recovery_reference_id: string; // Recovery tracking id or service_record_id
  service_record_id: string; // UUID
  farmer_id: string; // UUID
  field_agent_id: string; // UUID
  crop: CropType;
  bags_received: number;
  batch_id: string; // UUID (batch created from this inbound)
  recovery_status: RecoveryStatus;
  notes?: string;
}

export interface AggregatedInboundRecordedPayload {
  farmer_id: string; // UUID
  field_agent_id: string; // UUID
  crop: CropType;
  bags: number;
  batch_id: string; // UUID (batch created from this inbound)
  notes?: string;
}

// ============================================
// DATA MODELS
// ============================================

export interface FieldAgent {
  id: string;
  name: string;
  phone: string;
  communities: string[]; // Array of communities/zones assigned
  supervised_smes?: string[]; // Optional array of supervised SME identifiers
  status: FieldAgentStatus;
  created_at: Date;
  created_by: string;
}

export interface Farmer {
  id: string;
  field_agent_id: string;
  warehouse_id: string;
  name: string;
  phone?: string;
  community?: string;
  status: FarmerStatus;
  created_at: Date;
  created_by: string;
}

export interface ServiceRecord {
  id: string;
  farmer_id: string;
  field_agent_id: string;
  warehouse_id: string;
  service_types: ServiceType[];
  land_services?: Array<{
    service_type: ServiceType;
    date: string;
    notes?: string;
  }>;
  land_size_acres?: number;
  fertilizer_type?: string;
  fertilizer_quantity_kg?: number;
  pesticide_type?: string;
  pesticide_quantity_liters?: number;
  expected_bags: number;
  expected_recovery_date?: Date; // When recovery is expected
  original_expected_date?: Date; // Original date (immutable)
  recovery_status: RecoveryStatus;
  harvest_completed_at?: Date; // DEPRECATED - no longer used
  date_update_history?: Array<{
    updated_at: Date;
    old_date: Date;
    new_date: Date;
    reason: string;
    updated_by: string;
  }>;
  created_at: Date;
}

export interface RecoveryTracking {
  id: string;
  service_record_id: string;
  farmer_id: string;
  warehouse_id: string;
  expected_bags: number;
  received_bags: number;
  recovery_status: RecoveryStatus;
  batch_id?: string;
  created_at: Date;
  completed_at?: Date;
}

