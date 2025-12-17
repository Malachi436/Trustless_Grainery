import { Stack } from 'expo-router';

export default function AttendantLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="log-inbound" />
      <Stack.Screen name="request-dispatch" />
      <Stack.Screen name="execute-dispatch/[id]" />
    </Stack>
  );
}
