import { Redirect, useLocalSearchParams } from "expo-router";

export default function ChatAliasRoute() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : undefined;

  return (
    <Redirect
      href={{
        pathname: "/private/chat",
        params: { id, conversationId },
      }}
    />
  );
}

