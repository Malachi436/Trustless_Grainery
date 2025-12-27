/**
 * Event Types - Extended Event System
 * Core 6 events (MVP) + Extended events for batch/payment/tools
 * All events are immutable and append-only.
 */
export enum EventType {
  // Core inventory events
  GENESIS_INVENTORY_RECORDED = 'GENESIS_INVENTORY_RECORDED',
  STOCK_INBOUND_RECORDED = 'STOCK_INBOUND_RECORDED',
  
  // Outbound workflow events
  OUTBOUND_REQUESTED = 'OUTBOUND_REQUESTED',
  OUTBOUND_APPROVED = 'OUTBOUND_APPROVED',
  OUTBOUND_REJECTED = 'OUTBOUND_REJECTED',
  DISPATCH_EXECUTED = 'DISPATCH_EXECUTED',
  
  // Extended events (v2 features)
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  TOOL_ASSIGNED = 'TOOL_ASSIGNED',
  TOOL_RETURNED = 'TOOL_RETURNED',
}

/**
 * User Roles - Hard separation enforced server-side
 */
export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  OWNER = 'OWNER',
  ATTENDANT = 'ATTENDANT',
}

/**
 * Warehouse Status - State machine
 */
export enum WarehouseStatus {
  SETUP = 'SETUP',
  GENESIS_PENDING = 'GENESIS_PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Request Status - Derived from events, never authoritative
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
}

/**
 * Crop Types
 */
export enum CropType {
  MAIZE = 'Maize',
  RICE = 'Rice',
  SOYBEANS = 'Soybeans',
  WHEAT = 'Wheat',
  MILLET = 'Millet',
}

/**
 * Batch Source Types
 */
export enum BatchSourceType {
  OWN_FARM = 'OWN_FARM',
  SME = 'SME',
  SMALL_FARMER = 'SMALL_FARMER',
}

/**
 * Buyer Classification Types
 */
export enum BuyerType {
  AGGREGATOR = 'AGGREGATOR',
  OFF_TAKER = 'OFF_TAKER',
  OPEN_MARKET = 'OPEN_MARKET',
}

/**
 * Payment Methods
 */
export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  IN_KIND = 'IN_KIND',
  CREDIT = 'CREDIT',
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
}

/**
 * Tool Status
 */
export enum ToolStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  RETIRED = 'RETIRED',
}
