// API Configuration for Admin Dashboard
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  
  // Admin
  ADMIN_WAREHOUSES: `${API_BASE_URL}/api/admin/warehouses`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_GENESIS: (warehouseId: string) => `${API_BASE_URL}/api/admin/warehouses/${warehouseId}/genesis`,
  ADMIN_DELETE_WAREHOUSE: (warehouseId: string) => `${API_BASE_URL}/api/admin/warehouses/${warehouseId}`,
  ADMIN_SUSPEND_WAREHOUSE: (warehouseId: string) => `${API_BASE_URL}/api/admin/warehouses/${warehouseId}/suspend`,
  ADMIN_AUDIT: `${API_BASE_URL}/api/admin/audit`,
  
  // User Management
  ADMIN_CREATE_USER: `${API_BASE_URL}/api/admin/users`,
  ADMIN_UPDATE_USER: (userId: string) => `${API_BASE_URL}/api/admin/users/${userId}`,
  ADMIN_DELETE_USER: (userId: string) => `${API_BASE_URL}/api/admin/users/${userId}`,
};

export { API_BASE_URL };