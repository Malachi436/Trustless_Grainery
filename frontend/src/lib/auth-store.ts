import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Warehouse, UserRole } from './types';

interface AuthStore {
  // State
  user: User | null;
  warehouse: Warehouse | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setWarehouse: (warehouse: Warehouse | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, warehouse: Warehouse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      warehouse: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setWarehouse: (warehouse) => set({ warehouse }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, warehouse) =>
        set({
          user,
          warehouse,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          user: null,
          warehouse: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'trustless-granary-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        warehouse: state.warehouse,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);

// Selectors for optimized subscriptions
export const useUser = () => useAuthStore((s) => s.user);
export const useUserRole = (): UserRole | null => useAuthStore((s) => s.user?.role ?? null);
export const useWarehouse = () => useAuthStore((s) => s.warehouse);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useWarehouseStatus = () => useAuthStore((s) => s.warehouse?.status ?? null);
