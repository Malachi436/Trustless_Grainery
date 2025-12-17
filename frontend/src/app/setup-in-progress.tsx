import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Warehouse } from '@/lib/icons';
import { useAuthStore, useWarehouse } from '@/lib/auth-store';
import { Button } from '@/components/ui';

export default function SetupInProgressScreen() {
  const warehouse = useWarehouse();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#f0f9f1', '#f5f5f4', '#e9dfd0']}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 px-6 justify-center">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-sand-200 items-center justify-center mb-6">
              <Clock size={48} color="#ab8661" />
            </View>

            <Text className="text-2xl font-bold text-neutral-800 text-center mb-4">
              Setup In Progress
            </Text>

            <Text className="text-base text-neutral-600 text-center mb-2">
              {warehouse?.name || 'Your warehouse'} is being set up by the administrator.
            </Text>

            <Text className="text-sm text-neutral-500 text-center mb-8">
              You'll be notified once setup is complete and you can start using the system.
            </Text>

            <View className="bg-white rounded-2xl p-6 w-full mb-8">
              <View className="flex-row items-center mb-3">
                <Warehouse size={20} color="#3d9448" />
                <Text className="text-base font-medium text-neutral-700 ml-2">
                  What's being set up?
                </Text>
              </View>
              <View className="space-y-2">
                <Text className="text-sm text-neutral-600">• Warehouse configuration</Text>
                <Text className="text-sm text-neutral-600">• Genesis inventory recording</Text>
                <Text className="text-sm text-neutral-600">• User permissions</Text>
                <Text className="text-sm text-neutral-600">• System initialization</Text>
              </View>
            </View>

            <Button onPress={logout} variant="ghost">
              Sign Out
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
