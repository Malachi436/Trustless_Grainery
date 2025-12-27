// API Configuration for Owner Dashboard
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  
  // Owner Analytics (Multi-Owner Safe)
  OWNER_WAREHOUSES: `${API_BASE_URL}/api/owner/warehouses`,
  ANALYTICS_SNAPSHOT: `${API_BASE_URL}/api/owner/analytics/snapshot`,
  ANALYTICS_TRANSACTIONS: `${API_BASE_URL}/api/owner/analytics/transactions`,
  ANALYTICS_TRANSACTION_DETAILS: (requestId: string) => `${API_BASE_URL}/api/owner/analytics/transactions/${requestId}`,
  ANALYTICS_BATCHES: `${API_BASE_URL}/api/owner/analytics/batches`,
  ANALYTICS_CREDIT: `${API_BASE_URL}/api/owner/analytics/credit`,
  ANALYTICS_BUYERS: `${API_BASE_URL}/api/owner/analytics/buyers`,
  ANALYTICS_TOOLS: `${API_BASE_URL}/api/owner/analytics/tools-dashboard`,
  ANALYTICS_TOOL_HISTORY: (toolId: string) => `${API_BASE_URL}/api/owner/analytics/tools/${toolId}/history`,
  ANALYTICS_ATTENDANTS: `${API_BASE_URL}/api/owner/analytics/attendants`,
  
  // Owner Actions (Existing)
  OWNER_APPROVALS: `${API_BASE_URL}/api/owner/approvals`,
  OWNER_APPROVE: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/approve`,
  OWNER_REJECT: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/reject`,
};

export { API_BASE_URL };
