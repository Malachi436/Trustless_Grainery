import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useIsAuthenticated, useUserRole, useIsAuthLoading } from '@/lib/auth-store';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const userRole = useUserRole();
  const isLoading = useIsAuthLoading();
  const [isMounted, setIsMounted] = useState(false);

  // Wait for component to mount
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (userRole === 'owner') {
      router.replace('/owner');
    } else if (userRole === 'attendant') {
      router.replace('/attendant');
    } else if (userRole === 'field_agent') {
      router.replace('/field-agent');
    } else {
      router.replace('/login');
    }
  }, [isMounted, isLoading, isAuthenticated, userRole, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <ActivityIndicator size="large" color="#3d9448" />
      <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
    </View>
  );
}
