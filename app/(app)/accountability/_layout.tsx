import { Stack } from 'expo-router';

export default function AccountabilityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="submit" />
      <Stack.Screen name="review" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="report" />
    </Stack>
  );
}
