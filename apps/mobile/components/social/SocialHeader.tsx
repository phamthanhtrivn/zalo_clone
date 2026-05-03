import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";

export default function SocialHeader({
    onCreatePost,
}: {
    onCreatePost?: () => void;
}) {
    const router = useRouter();

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
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}