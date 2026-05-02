import { Stack } from "expo-router";
import { SocketProvider } from "@/contexts/SocketContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import IncomingCallOverlay from "@/components/video-call/IncomingCallOverlay";
import OutgoingCallOverlay from "@/components/video-call/OutgoingCallOverlay";
import ActiveCallOverlay from "@/components/video-call/ActiveCallOverlay";

export default function PrivateLayout() {
  return (
    <SocketProvider>
      <VideoCallProvider>
        <IncomingCallOverlay />
        <OutgoingCallOverlay />
        <ActiveCallOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="setting" />
          <Stack.Screen name="search" />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="update-profile" />
          <Stack.Screen name="qr-scanner" />
          <Stack.Screen name="confirm-qr-login" />
        </Stack>
      </VideoCallProvider>
    </SocketProvider>
  );
}
