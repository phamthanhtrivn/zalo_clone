import Tips from "@/components/auth/Tips";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function ForgotPassword() {
  const router = useRouter();
  const [phone, setPhone] = useState<string>("");

  const handleOnChangePhone = (phone: string) => {
    setPhone(phone);
  };

  const clearPhone = () => {
    setPhone("");
  };

  return (
    <Container>
      <Header gradient back />
      <Tips text="Nhập số điện thoại để nhận mã xác thực" />
      <View className="px-screen-edge gap-5 mt-2">
        <Input
          placeholder="Số điện thoại"
          icon="close-outline"
          value={phone}
          onChangeText={handleOnChangePhone}
          onPress={clearPhone}
        />
        <Button className="bg-primary py-3 w-56">
          <Text className="text-white font-semibold text-sm ">Tiếp tục</Text>
        </Button>
      </View>
    </Container>
  );
}
