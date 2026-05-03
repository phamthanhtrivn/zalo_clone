import { View, Text, Pressable } from "react-native";

export default function FeedTopTabs({ activeTab, onChange }: any) {
    return (
        <View className="flex-row bg-white">
            {["diary", "video"].map((tab) => {
                const active = activeTab === tab;
                return (
                    <Pressable
                        key={tab}
                        onPress={() => onChange(tab)}
                        className="flex-1 items-center py-4"
                    >
                        <Text className={active ? "font-bold" : "text-gray-400"}>
                            {tab === "diary" ? "Nhật ký" : "Video"}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}