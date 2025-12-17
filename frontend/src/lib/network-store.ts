import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStore {
  isConnected: boolean;
  isInternetReachable: boolean;
  lastChecked: string | null;

  setNetworkState: (state: NetInfoState) => void;
  checkConnection: () => Promise<void>;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isConnected: true,
  isInternetReachable: true,
  lastChecked: null,

  setNetworkState: (state: NetInfoState) =>
    set({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      lastChecked: new Date().toISOString(),
    }),

  checkConnection: async () => {
    const state = await NetInfo.fetch();
    set({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      lastChecked: new Date().toISOString(),
    });
  },
}));

// Selectors
export const useIsOnline = () => useNetworkStore((s) => s.isConnected && s.isInternetReachable);
export const useIsConnected = () => useNetworkStore((s) => s.isConnected);

// Initialize network listener
export const initializeNetworkListener = () => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    useNetworkStore.getState().setNetworkState(state);
  });

  // Initial check
  useNetworkStore.getState().checkConnection();

  return unsubscribe;
};
