import { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function PostCard({ item }: { item: any }) {
    const timeStr = useMemo(() => {
        const date = new Date(item.createdAt);
        return (
            date.toLocaleDateString("vi-VN") +
            " " +
            date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })
        );
    }, [item.createdAt]);

    // Ưu tiên lấy name/avatar trực tiếp từ item (cấu trúc getFeed trả về)
    // Nếu không có thì mới tìm trong object lồng author/user
    const author = item.author || item.user || item.authorId;
    const displayName = item.name || author?.profile?.name || author?.name || "Người dùng Zalo";
    const displayAvatar = (item.avatar && item.avatar !== "") ? item.avatar :
        (author?.profile?.avatarUrl || author?.avatarUrl ||
            "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9");

    // Nội dung bài đăng (có thể là field 'content' hoặc 'text')
    const contentText = item.content || item.text || "";

    return (
        <View className="bg-white px-4 py-4">
            <View className="flex-row">
                {/* AVATAR */}
                <Image
                    source={{ uri: displayAvatar }}
                    style={{ width: 52, height: 52, borderRadius: 26 }}
                />

                <View className="ml-3 flex-1">
                    {/* HEADER */}
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-[16px] font-bold text-[#111827]">
                                {displayName}
                            </Text>
                            <Text className="text-[13px] text-[#6b7280]">{timeStr}</Text>
                        </View>

                        <TouchableOpacity>
                            <Ionicons
                                name="ellipsis-horizontal"
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* CONTENT */}
                    <Text className="mt-3 text-[15px] text-[#111827]">
                        {contentText}
                    </Text>

                    {/* IMAGE */}
                    {item.images?.length > 0 && (
                        <Image
                            source={{ uri: item.images[0] }}
                            style={{
                                height: 300,
                                borderRadius: 16,
                                marginTop: 10,
                            }}
                            contentFit="cover"
                        />
                    )}

                    {/* ACTION BAR */}
                    <View className="mt-4 flex-row items-center justify-between bg-[#f3f4f6] px-4 py-3 rounded-2xl">
                        <TouchableOpacity className="flex-row items-center">
                            <Ionicons
                                name="heart-outline"
                                size={22}
                                color="#4b5563"
                            />
                            <Text className="ml-2 text-[#4b5563]">Thích</Text>
                        </TouchableOpacity>

                        <View className="h-6 w-px bg-gray-300" />

                        <View className="flex-row items-center">
                            <Text className="text-lg">💖</Text>
                            <Text className="ml-2 font-semibold">
                                {item.likes}
                            </Text>
                        </View>

                        <View className="h-6 w-px bg-gray-300" />

                        <TouchableOpacity className="flex-row items-center">
                            <Ionicons
                                name="chatbubble-outline"
                                size={22}
                                color="#4b5563"
                            />
                            <Text className="ml-2 text-[#4b5563]">
                                {item.comments}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}