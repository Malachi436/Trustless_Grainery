import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get the API base URL based on the current environment
 * - Static IP: Use 172.20.10.3 for your setup (configure here if needed)
 * - On physical device: Uses the local network IP from Expo manifest
 * - On web: Uses localhost
 * - On Android emulator: Uses 10.0.2.2 (special Android emulator localhost)
 */
function getApiUrl(): string {
  // STATIC IP OVERRIDE: Try multiple IPs for your machine
  // The app will use the first one that works
  const POSSIBLE_IPS = ['172.20.10.3', '192.168.109.1', '192.168.181.1'];
  const STATIC_IP = POSSIBLE_IPS[0]; // Primary IP
  
  // Get debugger host from Expo Constants
  const { manifest } = Constants;
  // @ts-ignore - expoConfig can have debuggerHost
  const debuggerHost = Constants.expoConfig?.hostUri || 
                       // @ts-ignore
                       manifest?.debuggerHost || 
                       // @ts-ignore
                       manifest?.hostUri;
  
  console.log('Platform:', Platform.OS);
  console.log('Debugger Host:', debuggerHost);
  console.log('Available Backend IPs:', POSSIBLE_IPS.join(', '));
  
  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // If static IP is configured, use it
  if (STATIC_IP) {
    const apiUrl = `http://${STATIC_IP}:4000`;
    console.log('Using static API URL:', apiUrl);
    return apiUrl;
  }

  // For physical devices (iOS/Android), extract IP from debuggerHost
  if (debuggerHost) {
    // Extract IP from debuggerHost (format: "192.168.1.100:8081" or "192.168.1.100:8082")
    const host = debuggerHost.split(':').shift();
    const apiUrl = `http://${host}:4000`;
    console.log('Using auto-detected API URL:', apiUrl);
    return apiUrl;
  }

  // Fallback for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  // Last resort fallback to localhost
  console.warn('Could not determine API URL, using localhost');
  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiUrl();

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REFRESH: `${API_BASE_URL}/api/auth/refresh`,
  
  // Owner
  OWNER_DASHBOARD: `${API_BASE_URL}/api/owner/dashboard`,
  OWNER_GENESIS_STATUS: `${API_BASE_URL}/api/owner/genesis-status`,
  OWNER_GENESIS: `${API_BASE_URL}/api/owner/genesis`,
  OWNER_APPROVALS: `${API_BASE_URL}/api/owner/approvals`,
  OWNER_APPROVE: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/approve`,
  OWNER_REJECT: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/reject`,
  OWNER_AUDIT: `${API_BASE_URL}/api/owner/audit`,
  OWNER_BATCHES: `${API_BASE_URL}/api/owner/batches`,
  OWNER_TOOLS: `${API_BASE_URL}/api/owner/tools`,
  OWNER_ASSIGN_TOOL: (toolId: string) => `${API_BASE_URL}/api/owner/tools/${toolId}/assign`,
  OWNER_BATCH_ALLOCATIONS: (requestId: string) => `${API_BASE_URL}/api/owner/requests/${requestId}/allocations`,
  OWNER_VERIFY_QR: (batchCode: string) => `${API_BASE_URL}/api/owner/batches/verify/${encodeURIComponent(batchCode)}`,
  
  // Attendant
  ATTENDANT_HOME: `${API_BASE_URL}/api/attendant/home`,
  ATTENDANT_LOG_INBOUND: `${API_BASE_URL}/api/attendant/inbound`,
  ATTENDANT_REQUEST_DISPATCH: `${API_BASE_URL}/api/attendant/requests`,
  ATTENDANT_MY_REQUESTS: `${API_BASE_URL}/api/attendant/requests`,
  ATTENDANT_EXECUTE: (requestId: string) => `${API_BASE_URL}/api/attendant/requests/${requestId}/execute`,
  ATTENDANT_TOOLS: `${API_BASE_URL}/api/attendant/tools`,
  ATTENDANT_RETURN_TOOL: (toolId: string) => `${API_BASE_URL}/api/attendant/tools/${toolId}/return`,
  ATTENDANT_CONFIRM_PAYMENT: (requestId: string) => `${API_BASE_URL}/api/attendant/requests/${requestId}/confirm-payment`,
  ATTENDANT_FARMERS_WITH_RECOVERY: `${API_BASE_URL}/api/attendant/farmers-with-recovery`,
  ATTENDANT_BATCH_SCAN: `${API_BASE_URL}/api/attendant/batch/scan`,
  ATTENDANT_BATCH_VERIFY: (batchCode: string) => `${API_BASE_URL}/api/attendant/batch/verify/${encodeURIComponent(batchCode)}`,
  ATTENDANT_BATCH_ALLOCATIONS: (requestId: string) => `${API_BASE_URL}/api/owner/requests/${requestId}/allocations`,
  ATTENDANT_RECOVERY_INBOUND: `${API_BASE_URL}/api/attendant/recovery-inbound`,
  ATTENDANT_AGGREGATED_INBOUND: `${API_BASE_URL}/api/attendant/aggregated-inbound`,
  
  // Admin
  ADMIN_CREATE_WAREHOUSE: `${API_BASE_URL}/api/admin/warehouses`,
  ADMIN_CREATE_USER: `${API_BASE_URL}/api/admin/users`,
  
  // Field Agent
  FIELD_AGENT_FARMERS: `${API_BASE_URL}/api/field-agent/farmers`,
  FIELD_AGENT_EXPECTED_INVENTORY: `${API_BASE_URL}/api/field-agent/expected-inventory`,
  FIELD_AGENT_RECORD_SERVICE: (farmerId: string) => `${API_BASE_URL}/api/field-agent/farmers/${farmerId}/services`,
  FIELD_AGENT_HARVEST_COMPLETE: (farmerId: string) => `${API_BASE_URL}/api/field-agent/farmers/${farmerId}/harvest-complete`,
  FIELD_AGENT_RECOVERY_INBOUND: `${API_BASE_URL}/api/field-agent/recovery-inbound`,
  FIELD_AGENT_AGGREGATED_INBOUND: `${API_BASE_URL}/api/field-agent/aggregated-inbound`,
};

// Helper function to log the current API URL (useful for debugging)
export function logApiUrl() {
  console.log('API Base URL:', API_BASE_URL);
}
