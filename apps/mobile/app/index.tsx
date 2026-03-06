import Button from "@/components/Button";
import { Image, Text, Touchable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView className="flex-1">
      <View className="h-[15%] mx-auto justify-center ">
        <Text className="text-5xl font-semibold text-primary">Zalo</Text>
      </View>
      <View className="h-[60%] mx-auto"></View>
      <View className="h-[25%] w-[80%] mx-auto gap-5">
        <Button className="bg-primary">
          <Text className="text-xl font-semibold text-white">Đăng nhập</Text>
        </Button>
        <Button className="bg-accent">
          <Text className="text-xl font-semibold">Đăng ký</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
