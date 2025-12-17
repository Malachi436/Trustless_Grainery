import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from '@/lib/icons';
import { useIsOnline } from '@/lib/network-store';

export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View className="bg-sand-600 px-4 py-3 flex-row items-center">
      <WifiOff size={18} color="#fff" />
      <Text className="text-white text-sm font-medium ml-2 flex-1">
        You're offline. Some features are disabled.
      </Text>
    </View>
  );
}

interface OnlineOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OnlineOnly({ children, fallback }: OnlineOnlyProps) {
  const isOnline = useIsOnline();

  if (!isOnline) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
