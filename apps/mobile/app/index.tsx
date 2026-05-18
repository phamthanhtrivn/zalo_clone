import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import ZolaLogo from "@/assets/images/ZolaZola.svg";

export default function Index() {
  const router = useRouter();

  const handleOnClickLogIn = () => {
    router.push("/(auth)/login");
  };

  const handleOnClickRegister = () => {
    router.push("/(auth)/register");
  };

  return (
    <Container className="bg-blue-50">
      <View className="h-[15%] pt-32 mx-auto justify-center">
        <ZolaLogo width={240} height={80} />
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
