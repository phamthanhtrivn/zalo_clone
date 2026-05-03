import { Stack } from "expo-router";

export default function SocialLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create-post"
        options={{
          headerShown: false,
          title: "Tạo bài viết",
          headerBackTitle: "Hủy"
        }}
      />
    </Stack>
  );
}
