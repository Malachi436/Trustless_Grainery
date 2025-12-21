import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get the API base URL based on the current environment
 * - On physical device: Uses the local network IP from Expo manifest
 * - On web: Uses localhost
 * - On Android emulator: Uses 10.0.2.2 (special Android emulator localhost)
 */
function getApiUrl(): string {
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
  
  // For web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // For physical devices (iOS/Android), extract IP from debuggerHost
  if (debuggerHost) {
    // Extract IP from debuggerHost (format: "192.168.1.100:8081" or "192.168.1.100:8082")
    const host = debuggerHost.split(':').shift();
    const apiUrl = `http://${host}:4000`;
    console.log('Using API URL:', apiUrl);
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
  OWNER_GENESIS: `${API_BASE_URL}/api/owner/genesis`,
  OWNER_APPROVALS: `${API_BASE_URL}/api/owner/approvals`,
  OWNER_APPROVE: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/approve`,
  OWNER_REJECT: (requestId: string) => `${API_BASE_URL}/api/owner/approvals/${requestId}/reject`,
  OWNER_AUDIT: `${API_BASE_URL}/api/owner/audit`,
  
  // Attendant
  ATTENDANT_HOME: `${API_BASE_URL}/api/attendant/home`,
  ATTENDANT_LOG_INBOUND: `${API_BASE_URL}/api/attendant/inbound`,
  ATTENDANT_REQUEST_DISPATCH: `${API_BASE_URL}/api/attendant/requests`,
  ATTENDANT_MY_REQUESTS: `${API_BASE_URL}/api/attendant/requests`,
  ATTENDANT_EXECUTE: (requestId: string) => `${API_BASE_URL}/api/attendant/requests/${requestId}/execute`,
  
  // Admin
  ADMIN_CREATE_WAREHOUSE: `${API_BASE_URL}/api/admin/warehouses`,
  ADMIN_CREATE_USER: `${API_BASE_URL}/api/admin/users`,
};

// Helper function to log the current API URL (useful for debugging)
export function logApiUrl() {
  console.log('API Base URL:', API_BASE_URL);
}
