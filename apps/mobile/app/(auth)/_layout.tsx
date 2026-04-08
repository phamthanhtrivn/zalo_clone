import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
<<<<<<< HEAD
    <Stack>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="register" />
=======
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="register" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="complete-register" />
>>>>>>> origin/main
    </Stack>
  );
}
