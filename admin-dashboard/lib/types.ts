// Type definitions for Admin Dashboard
export type UserRole = 'PLATFORM_ADMIN' | 'OWNER' | 'ATTENDANT';

export type WarehouseStatus = 'SETUP' | 'GENESIS_PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  warehouseId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  status: WarehouseStatus;
  ownerId?: string;
  ownerName?: string;
  attendants?: User[];
  genesisStatus?: 'PENDING' | 'CONFIRMED';
  createdAt: string;
}

export interface GenesisInventory {
  cropType: string;
  bags: number;
  photoUrls?: string[];
  notes?: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  action: string;
  timestamp: string;
  metadata?: any;
}

export interface DashboardStats {
  totalWarehouses: number;
  warehousesAwaitingGenesis: number;
  activeWarehouses: number;
  suspendedWarehouses: number;
  ownersOnboarded: number;
  attendantsOnboarded: number;
}
