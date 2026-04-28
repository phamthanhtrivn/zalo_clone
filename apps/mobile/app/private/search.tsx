import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Container from "@/components/common/Container";
import { conversationService } from "@/services/conversation.service";
import { useAppSelector } from "@/store/store";
import { Image } from "react-native";

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "contacts", label: "Bạn bè" },
  { id: "groups", label: "Nhóm" },
  { id: "messages", label: "Tin nhắn" },
  { id: "files", label: "File" },
];

export default function SearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState("all");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Lấy user từ auth store giống như trong ChatWindow để đảm bảo có userId hợp lệ
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.userId || (user as any)?._id;

  // Logic tìm kiếm Debounce
  useEffect(() => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setResults(null);
      return;
    }

    // Kiểm tra userId hợp lệ (định dạng MongoDB ObjectId) để tránh lỗi 400
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error("Invalid or missing user ID, skipping search.");
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await conversationService.search({
          userId,
          keyword: trimmedKeyword,
          scope: scope as any,
        });
        if (res?.success) {
          setResults(res.data);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [keyword, scope, userId]);

  const renderSearchResult = ({ item }: { item: any }) => {
    const isContact = !!item.userId && !item.messageId && !item.file && !item.memberLabel;
    const isMessage = !!item.messageId;
    const isGroup = !!item.memberLabel && !item.messageId && !item.file && !item.userId;
    const isFile = !!item.file;

    const handlePress = () => {
      const conversationId = item.conversationId || item._id;

      if (isContact) {
        if (item.conversationId) {
          router.push(`/private/chat/${item.conversationId}`);
        } else {
          router.push({
            pathname: "/private/chat/[id]",
            params: { id: "new", targetUserId: item.userId }
          });
        }
        return;
      }

      if (isMessage || isFile) {
        router.push({
          pathname: `/private/chat/${conversationId}`,
          params: { messageId: item.messageId }
        });
      } else {
        router.push(`/private/chat/${conversationId}`);
      }
    };

    let displayName = "Người dùng";
    let avatarSource = "https://avatar.iran.liara.run/public/0";
    let subLabel = "";
    let icon = null;

    if (isContact) {
      displayName = item.name || item.phone || "Người dùng";
      avatarSource = item.avatar || avatarSource;
      if (item.isFriend) {
        subLabel = "Bạn bè";
      } else if (item.isExistingConversation) {
        subLabel = "Đã trò chuyện";
      } else {
        subLabel = item.phone || "Chưa kết bạn";
      }
    } else if (isGroup) {
      displayName = item.name || "Nhóm";
      avatarSource = item.avatar || avatarSource;
      subLabel = "Nhóm";
      icon = <Ionicons name="people" size={14} color="#6b7280" />;
    } else if (isMessage) {
      displayName = item.conversationName || "Cuộc trò chuyện";
      avatarSource = item.conversationAvatar || avatarSource;
      subLabel = `${item.senderName}: ${item.text}`;
      icon = <Ionicons name="chatbubble-outline" size={14} color="#6b7280" />;
    } else if (isFile) {
      displayName = item.conversationName || "Cuộc trò chuyện";
      avatarSource = item.conversationAvatar || avatarSource;
      subLabel = `${item.senderName}: ${item.file.fileName}`;
      icon = <Ionicons name="document-outline" size={14} color="#6b7280" />;
    }

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100"
        onPress={handlePress}
      >
        <Image
          source={{ uri: avatarSource }}
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold text-black" numberOfLines={1}>
              {displayName}
            </Text>
            {icon}
          </View>

          <Text className="text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
            {subLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Container className="flex-1 bg-[#F1F2F4]">
      {/* Header tìm kiếm chuẩn Zalo - Cố định padding top cho các dòng máy */}
      <View
        className="bg-[#0091ff] h-14 px-2 flex-row items-center shadow-sm"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center bg-white/20 rounded-md px-3 h-10">
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.9)" />
          <TextInput
            autoFocus
            placeholder="Tìm kiếm bạn bè, tin nhắn..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            className="flex-1 ml-2 text-white text-[16px]"
            style={{
              paddingVertical: 0,
              textAlignVertical: 'center',
              includeFontPadding: false
            }}
            value={keyword}
            onChangeText={setKeyword}
            selectionColor="white"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword("")}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity className="p-2 ml-1" onPress={() => console.log('Scan QR')}>
          <MaterialCommunityIcons name="qrcode-scan" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs Filter */}
      <View className="flex-row border-b border-gray-200 bg-white">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setScope(tab.id)}
            className={`flex-1 items-center py-2.5 border-b-2 ${scope === tab.id ? "border-[#0091ff]" : "border-transparent"
              }`}
          >
            <Text
              className={`text-[14px] ${scope === tab.id ? "text-[#0091ff] font-medium" : "text-gray-500"
                }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách kết quả */}
      <View className="flex-1 bg-[#F1F2F4]">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#0091ff" />
            <Text className="mt-2 text-gray-400 text-xs">Đang tìm kiếm...</Text>
          </View>
        ) : keyword.trim() === "" ? (
          <ScrollView className="flex-1">
            <View className="p-4 items-center mt-10">
              <Ionicons name="search-outline" size={80} color="#D1D5DB" />
              <Text className="text-gray-400 text-center mt-4 text-[15px]">
                Tìm kiếm bạn bè, tin nhắn, nhóm...
              </Text>
            </View>
            {/* Bạn có thể thêm phần 'Tìm kiếm gần đây' ở đây */}
          </ScrollView>
        ) : (
          <FlatList
            data={[...(results?.contacts || []), ...(results?.groups || []), ...(results?.messages || []), ...(results?.files || [])]}
            keyExtractor={(item, index) => (item.conversationId || item.userId || item.messageId || item._id) + index}
            renderItem={renderSearchResult}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <Text className="text-gray-500 text-center">
                  Không tìm thấy kết quả phù hợp cho "{keyword}"
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </Container>
  );
}