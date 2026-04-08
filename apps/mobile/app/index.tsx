<<<<<<< HEAD
import Button from "@/components/Button";
import { Image, Text, Touchable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
=======
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { useRouter } from "expo-router";
import { Image, Text, Touchable, TouchableOpacity, View } from "react-native";
>>>>>>> origin/main

export default function Index() {
  const router = useRouter();

  const handleOnClickLogIn = () => {
    router.push("/(auth)/login");
  };

  const handleOnClickRegister = () => {
    router.push("/(auth)/register");
  };

  return (
<<<<<<< HEAD
    <SafeAreaView className="flex-1">
=======
    <Container>
>>>>>>> origin/main
      <View className="h-[15%] mx-auto justify-center ">
        <Text className="text-5xl font-semibold text-primary">Zalo</Text>
      </View>
      <View className="h-[60%] mx-auto"></View>
      <View className="h-[25%] w-[80%] mx-auto gap-5">
<<<<<<< HEAD
        <Button className="bg-primary">
          <Text className="text-xl font-semibold text-white">Đăng nhập</Text>
        </Button>
        <Button className="bg-accent">
          <Text className="text-xl font-semibold">Đăng ký</Text>
        </Button>
      </View>
    </SafeAreaView>
=======
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
>>>>>>> origin/main
  );
}
