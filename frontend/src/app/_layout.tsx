import { useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../../global.css';
import {
  useIsAuthLoading,
} from '@/lib/auth-store';
import { initializeNetworkListener } from '@/lib/network-store';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function RootLayoutNav() {
  const isLoading = useIsAuthLoading();

  // Initialize network listener
  useEffect(() => {
    const unsubscribe = initializeNetworkListener();
    return unsubscribe;
  }, []);

  // Hide splash screen when ready
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Image 
          source={require('../../assets/logo.png')} 
          style={{ width: 120, height: 120, marginBottom: 20 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#3d9448" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="setup-in-progress" />
      <Stack.Screen name="attendant" />
      <Stack.Screen name="owner" />
      <Stack.Screen name="field-agent" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
