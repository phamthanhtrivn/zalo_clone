import { ScrollView, View, Text } from "react-native";

export default function StoriesStrip() {
    return (
        <ScrollView horizontal className="bg-white p-4">
            <View className="mr-3">
                <Text>Story 1</Text>
            </View>
            <View className="mr-3">
                <Text>Story 2</Text>
            </View>
        </ScrollView>
    );
}