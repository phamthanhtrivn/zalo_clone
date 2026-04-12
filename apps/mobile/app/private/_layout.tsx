import { Stack } from "expo-router";

<<<<<<< HEAD
export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="setting" />
      <Stack.Screen name="search" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="update-profile" />
    </Stack>
=======
import { SocketProvider } from "@/contexts/SocketContext";

export default function PrivateLayout() {
  return (
    <SocketProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="setting" />
        <Stack.Screen name="search" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="update-profile" />
      </Stack>
    </SocketProvider>
>>>>>>> ab3cba3247be0ab8bd4e07f815c36f20957c22f6
  );
}
