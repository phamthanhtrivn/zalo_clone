import Tips from "@/components/auth/Tips";
import AgreementCheckBox from "@/components/common/AgreementCheckBox";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { isVietnamPhone } from "@/utils/data-check";
import { useState } from "react";
import { Text, View } from "react-native";

export default function Register() {
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
        {!validPhone && (
          <Text className="text-red-600">Số điện thoại không hợp lệ !</Text>
        )}

        <AgreementCheckBox onChange={handleOnClickCheckBox} checked={checked}>
          <Text>Tôi đồng ý với các điều khoản sử dụng Zalo</Text>
        </AgreementCheckBox>
        <Button
          className={`${canContinue ? "bg-primary" : "bg-secondary"} py-3 w-56`}
          disabled={!canContinue}
        >
          <Text className="text-white text-sm font-semibold ">Tiếp tục</Text>
        </Button>
      </View>
    </Container>
  );
}
