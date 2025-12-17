import { Stack } from 'expo-router';

export default function OwnerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="audit-timeline" />
      <Stack.Screen name="genesis-confirmation" />
    </Stack>
  );
}
