/**
 * Event Types - The Six Sacred Events (MVP)
 * These are the ONLY event types allowed in the system.
 * NO modifications without spec approval.
 */
export enum EventType {
  GENESIS_INVENTORY_RECORDED = 'GENESIS_INVENTORY_RECORDED',
  STOCK_INBOUND_RECORDED = 'STOCK_INBOUND_RECORDED',
  OUTBOUND_REQUESTED = 'OUTBOUND_REQUESTED',
  OUTBOUND_APPROVED = 'OUTBOUND_APPROVED',
  OUTBOUND_REJECTED = 'OUTBOUND_REJECTED',
  DISPATCH_EXECUTED = 'DISPATCH_EXECUTED',
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
