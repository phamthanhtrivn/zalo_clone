import { Stack } from "expo-router";

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="setting" />
      <Stack.Screen name="search" />
        <Stack.Screen name="search-profile" />
      <Stack.Screen name="suggest-friends" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="update-profile" />
    </Stack>
  );
}
