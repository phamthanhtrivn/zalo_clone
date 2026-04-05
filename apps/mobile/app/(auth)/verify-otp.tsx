import Tips from "@/components/auth/Tips";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import { ActivityIndicator, Text, ToastAndroid, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";
import OtpInput from "@/components/auth/OtpInput";
import Button from "@/components/common/Button";
import { useEffect, useState } from "react";
import { formatTime } from "@/utils/formater";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { signUp, verifyOtp } from "@/store/auth/authThunk";

export default function VerifyOtp() {
  const router = useRouter();
  const { user, error, loading } = useAppSelector((state: any) => state.auth);

  const { phone, expiresIn, purpose } = useLocalSearchParams() as {
    phone: string;
    expiresIn: string;
    purpose: string;
  };
  const [timeLeft, setTimeLeft] = useState<number>(Number(expiresIn));
  const [otp, setOtp] = useState<string>("");
  const dispatch = useAppDispatch();

  const canContinue = otp.length === 6;

  useEffect(() => {
    const timer = setInterval(() => {
      timeLeft > 0 && setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOnResendOtp = async () => {
    try {
      const data = await dispatch(signUp(String(phone))).unwrap();

      setTimeLeft(data.expiresIn);
      ToastAndroid.show(data.message, ToastAndroid.SHORT);
    } catch (err: any) {
      ToastAndroid.show(err, ToastAndroid.SHORT);
    }
  };

  const handleOnContinue = async () => {
    try {
      const data = await dispatch(verifyOtp({ phone, otp, purpose })).unwrap();
      router.push("/(auth)/complete-register");
      console.log(data);
    } catch (err: any) {
      console.log(error)
      ToastAndroid.show(err.message, ToastAndroid.SHORT);
    }
  };

  return (
    <Container>
      <Header
        back
        gradient
        centerChild={
          <Text className="text-white text-sm font-semibold">
            Nhập mã xác thực
          </Text>
        }
      />
      <Tips text="Vui lòng không chia sẻ mã xác thực để tránh mất tài khoản" />
      <View className="flex px-screen-edge mt-5 mx-auto items-center gap-4">
        <MaterialIcons name="message" size={70} color={COLORS.primary} />
        <View className="items-center">
          <Text className="text-sm font-semibold">
            Mã xác thực đã được gửi đến số{" "}
            <Text className="text-xl">{phone}</Text>
          </Text>
          <Text className="text-xs">Hãy nhập mã xác thực để đăng ký</Text>
        </View>
        <OtpInput onChange={(code) => setOtp(code)} />
        <View>
          <Text onPress={handleOnResendOtp}>
            Gửi lại mã{" "}
            <Text className="text-graident font-semibold">
              {formatTime(timeLeft)}
            </Text>
          </Text>
        </View>
        <Button
          onPress={handleOnContinue}
          className={`${canContinue && !loading ? "bg-primary" : "bg-secondary"} py-3 w-56`}
          disabled={!canContinue && loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className={`text-white font-semibold text-sm`}>Tiếp tục</Text>
          )}
        </Button>
      </View>
    </Container>
  );
}
