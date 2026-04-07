<<<<<<< HEAD
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { useRouter } from "expo-router";
import { Image, Text, Touchable, TouchableOpacity, View } from "react-native";
=======
import Button from "@/components/Button";
import { Image, Text, Touchable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
>>>>>>> PhamThanhTri

export default function Index() {
  const router = useRouter();

  const handleOnClickLogIn = () => {
    router.push("/(auth)/login");
  };

  const handleOnClickRegister = () => {
    router.push("/(auth)/register");
  };

  return (
    <Container>
      <View className="h-[15%] mx-auto justify-center ">
        <Text className="text-5xl font-semibold text-primary">Zalo</Text>
      </View>
      <View className="h-[60%] mx-auto"></View>
      <View className="h-[25%] w-[80%] mx-auto gap-5">
        <Button onPress={handleOnClickLogIn} className="bg-primary w-full py-4">
          <Text className="text-xl font-semibold text-white">Đăng nhập</Text>
        </Button>
        <Button
          className="bg-secondary w-full py-4"
          onPress={handleOnClickRegister}
        >
          <Text className="text-xl font-semibold">Đăng ký</Text>
        </Button>
      </View>
    </Container>
  );
}
