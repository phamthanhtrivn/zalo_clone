import Tips from "@/components/auth/Tips";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { Purpose } from "@/constants/types";
import { forgotPassword } from "@/store/auth/authThunk";
import { useAppDispatch } from "@/store/store";
import { isVietnamPhone } from "@/utils/data-check";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, ToastAndroid, TouchableOpacity, View } from "react-native";

export default function ForgotPassword() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [validPhone, setValidPhone] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>("");

  const handleOnChangePhone = (phone: string) => {
      setPhone(phone);
      setValidPhone(isVietnamPhone(phone));
    };


  const clearPhone = () => {
    setPhone("");
  };

  const handleOnContinue = async () => {
      try {
        const data = await dispatch(forgotPassword(phone)).unwrap();
  
        ToastAndroid.show(data.message, ToastAndroid.SHORT);
  
        router.push({
          params: { phone, expiresIn: data.expiresIn, purpose: Purpose.ForgotPassword },
          pathname: "/(auth)/verify-otp",
        });
      } catch (err: any) {
        ToastAndroid.show(err.message, ToastAndroid.LONG);
      }
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
          onPressOnIcon={clearPhone}
        />
        <Button className="bg-primary py-3 w-56" onPress={handleOnContinue}>
          <Text className="text-white font-semibold text-sm ">Tiếp tục</Text>
        </Button>
      </View>
    </Container>
  );
}
