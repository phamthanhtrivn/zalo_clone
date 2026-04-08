import Tips from "@/components/auth/Tips";
import AgreementCheckBox from "@/components/common/AgreementCheckBox";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { Purpose } from "@/constants/types";
import { signUp } from "@/store/auth/authThunk";
import { useAppDispatch } from "@/store/store";
import { isVietnamPhone } from "@/utils/data-check";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, ToastAndroid, View } from "react-native";

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [checked, setChecked] = useState<boolean>(false);
  const [validPhone, setValidPhone] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>("");

  const canContinue = checked && validPhone;
  const handleOnClickCheckBox = (value: boolean) => {
    setChecked(value);
  };

  const handleOnChangePhone = (phone: string) => {
    setPhone(phone);
    setValidPhone(isVietnamPhone(phone));
  };

  const handleSignUp = async () => {
    try {
      const data = await dispatch(signUp(phone)).unwrap();

      ToastAndroid.show(data.message, ToastAndroid.SHORT);

      router.push({
        params: { phone, expiresIn: data.expiresIn, purpose: Purpose.SignUp },
        pathname: "/(auth)/verify-otp",
      });
    } catch (err: any) {
      ToastAndroid.show(err.message, ToastAndroid.LONG);
    }
  };

  return (
    <Container>
      <Header
        gradient
        centerChild={
          <Text className="text-white font-semibold text-sm">
            Tạo tài khoản
          </Text>
        }
        back
      />
      <Tips text="Nhập số điện thoại của bạn để tạo tài khoản mới" />

      <View className="px-screen-edge mt-2 gap-3">
        <Input placeholder="Số điện thoại" onChangeText={handleOnChangePhone} />
        {!validPhone && phone && (
          <Text className="text-red-600">Số điện thoại không hợp lệ !</Text>
        )}

        <AgreementCheckBox onChange={handleOnClickCheckBox} checked={checked}>
          <Text>Tôi đồng ý với các điều khoản sử dụng Zalo</Text>
        </AgreementCheckBox>
        <Button
          onPress={handleSignUp}
          className={`${canContinue ? "bg-primary" : "bg-secondary"} py-3 w-56`}
          disabled={!canContinue}
        >
          <Text className="text-white text-sm font-semibold">Tiếp tục</Text>
        </Button>
      </View>
    </Container>
  );
}
