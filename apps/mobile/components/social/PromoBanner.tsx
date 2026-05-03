import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";

const promoImage =
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f";

export default function PromoBanner() {
    return (
        <View className="mx-4 mt-3 bg-blue-100 rounded-xl p-4 flex-row">
            <View className="flex-1">
                <Text className="font-bold text-blue-700">
                    KHOÁC MÀU CỜ LÊN ẢNH
                </Text>
                <TouchableOpacity className="bg-blue-500 mt-3 px-4 py-2 rounded-full">
                    <Text className="text-white">Tạo ảnh</Text>
                </TouchableOpacity>
            </View>

            <Image source={{ uri: promoImage }} style={{ width: 100, height: 100 }} />
        </View>
    );
}