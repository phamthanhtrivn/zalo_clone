import { Stack } from "expo-router";
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
  );
}
