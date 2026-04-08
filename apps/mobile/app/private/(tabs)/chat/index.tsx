import { FlatList, View, Text } from "react-native";
import { useAppSelector } from "@/store/store";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";
import ConversationItem from "@/components/chat/ConversationItem";

export default function Home() {
  const conversations = useAppSelector((state) => state.conversation.conversations);
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
      />
      <View className="flex-1 bg-white">
        {conversations.length === 0 ? (
          <View className="flex-1 justify-center items-center p-10">
            <Text className="text-gray-500 text-center">
              Chưa có cuộc trò chuyện nào. Hãy bắt đầu nhắn tin!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                currentUserId={user?.userId || ""}
              />
            )}
            keyExtractor={(item) => item.conversationId}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </Container>
  );
}
