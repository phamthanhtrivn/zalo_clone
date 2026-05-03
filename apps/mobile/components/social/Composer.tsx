import { View, Text } from "react-native";
import { Image } from "expo-image";

export default function Composer({ avatar }: any) {
    return (
        <View className="bg-white p-4 flex-row items-center">
            <Image
                source={{
                    uri:
                        avatar ||
                        "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9",
                }}
                style={{ width: 50, height: 50, borderRadius: 25 }}
            />

            <Text className="ml-3 text-gray-500">
                Hôm nay bạn thế nào?
            </Text>
        </View>
    );
}