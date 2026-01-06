import { Stack } from 'expo-router';

export default function FieldAgentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="farmers" />
      <Stack.Screen name="farmer-detail" />
      <Stack.Screen name="service-entry" />
      <Stack.Screen name="harvest" />
      <Stack.Screen name="inbound" />
      <Stack.Screen name="expected-inventory" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
