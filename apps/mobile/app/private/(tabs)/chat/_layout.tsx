import { conversationService } from "@/services/conversation.service";
import { setConversations } from "@/store/slices/conversationSlice";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function ChatLayout() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!user?.userId) return;
    const handleFet = async () => {
      const res = await conversationService.getConversationsFromUserId(
        user?.userId
      );
      if (res) {
        dispatch(setConversations(res));
      }
    };
    handleFet();
  }, [user?.userId, dispatch]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
