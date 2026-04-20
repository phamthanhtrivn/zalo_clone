import { Stack } from "expo-router";

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="setting" />
      <Stack.Screen name="search" />
      <Stack.Screen name="change-password" />
<<<<<<< HEAD
=======
      <Stack.Screen name="update-profile" />
>>>>>>> 30cf414fe9680fb67fe94f458295ad0a4eacf8dd
    </Stack>
  );
}
