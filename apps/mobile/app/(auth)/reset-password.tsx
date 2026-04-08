import Tips from "@/components/auth/Tips";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { resetPassword } from "@/store/auth/authThunk";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { useState } from "react";
import { ActivityIndicator, Text, ToastAndroid, View } from "react-native";

export default function ResetPassword() {
  const { loading, error, tmp_token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isHiddenPass, setHiddenPass] = useState<boolean>(true);
  const [isHiddenPass1, setHiddenPass1] = useState<boolean>(true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleOnContinue = async () => {
    try {
      await dispatch(
        resetPassword({
          data: { newPassword: password, confirmPassword: confirmPassword },
          tempToken: tmp_token,
        }),
      ).unwrap();
    } catch (err: any) {
      if (err && err.errors && Array.isArray(err.errors)) {
        const errorsObj: Record<string, string> = {};

        err.errors.forEach((item: any) => {
          if (item.field) {
            errorsObj[item.field] = item.error;
          }
        });

        setFieldErrors(errorsObj);
      }
      ToastAndroid.show(
        err.message || "Đặt lại mật khẩu thất bại !",
        ToastAndroid.SHORT,
      );
    }
  };

  return (
    <Container>
      <Header
        back
        gradient
        centerChild={
          <Text className="text-white text-sm font-semibold">
            Đặt lại mật khẩu
          </Text>
        }
      />
      <Tips text="Hãy chọn mật khẩu đủ mạnh để bảo vệ tài khoản" />
      <View className="px-screen-edge mt-2 gap-3">
        <Input
          placeholder="Mật khẩu mới"
          security
          onPressOnIcon={() => setHiddenPass(!isHiddenPass)}
          icon={isHiddenPass ? `eye-off-outline` : `eye-outline`}
          value={password}
          onChangeText={(value) => setPassword(value)}
        />
        {fieldErrors.newPassword && (
          <Text className="text-red-600 text-xs mt-1 ml-1">
            {fieldErrors.newPassword}
          </Text>
        )}
        <Input
          placeholder="Nhập lại mật khẩu mới"
          security
          onPressOnIcon={() => setHiddenPass1(!isHiddenPass1)}
          icon={isHiddenPass1 ? `eye-off-outline` : `eye-outline`}
          value={confirmPassword}
          onChangeText={(value) => setConfirmPassword(value)}
        />
        {fieldErrors.confirmPassword && (
          <Text className="text-red-600 text-xs mt-1 ml-1">
            {fieldErrors.confirmPassword}
          </Text>
        )}
        <Button
          onPress={handleOnContinue}
          className={`${loading ? "bg-secondary" : "bg-primary"} py-3 w-56`}
        >
          {loading ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text className={`text-white font-semibold text-sm`}>Tiếp tục</Text>
          )}
        </Button>
      </View>
    </Container>
  );
}
