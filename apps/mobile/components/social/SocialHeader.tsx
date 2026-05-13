import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { COLORS } from "@/constants/colors";
import { getSocialNotifications } from "@/services/social.service";
import { useSocket } from "@/contexts/SocketContext";

export default function SocialHeader({
    onCreatePost,
}: {
    onCreatePost?: () => void;
}) {
    const router = useRouter();
    const { socket } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);

    const loadUnreadCount = useCallback(async () => {
        try {
            const res: any = await getSocialNotifications();
            const rows = Array.isArray(res?.data) ? res.data : [];
            setUnreadCount(rows.filter((item: any) => !item.readAt).length);
        } catch {
            setUnreadCount(0);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUnreadCount();
        }, [loadUnreadCount]),
    );

    useFocusEffect(
        useCallback(() => {
            if (!socket) return;

            const handleNewNotification = () => {
                setUnreadCount((value) => value + 1);
            };

            socket.on("social:notification", handleNewNotification);
            return () => {
                socket.off("social:notification", handleNewNotification);
            };
        }, [socket]),
    );

    return (
        <LinearGradient
            colors={[COLORS.primary, COLORS.graient]}
            className="px-4 pb-4 pt-2"
        >
            <View className="flex-row items-center gap-3">

                {/* Search icon */}
                <Ionicons name="search-outline" size={26} color="white" />

                {/* Search box */}
                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/private/search",
                            params: { type: "social" },
                        })
                    }
                    className="flex-1 bg-white/20 rounded-full px-4 py-2"
                >
                    <Text className="text-white">Tìm kiếm</Text>
                </Pressable>

                {/* ➕ CREATE POST BUTTON */}
                <TouchableOpacity
                    onPress={onCreatePost}
                    className="bg-white/20 p-2 rounded-full"
                >
                    <Ionicons name="add-circle-outline" size={26} color="white" />
                </TouchableOpacity>

                {/* NOTIFICATION ICON */}
                <TouchableOpacity
                    onPress={() => router.push("/private/social-notifications")}
                    className="relative"
                >
                    <Ionicons name="notifications-outline" size={24} color="white" />
                    {unreadCount > 0 ? (
                        <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] items-center justify-center">
                            <Text className="text-white text-[10px] font-bold">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}
