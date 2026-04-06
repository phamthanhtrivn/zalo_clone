import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import {
  ScrollView,
  Text,
  View,
  ToastAndroid,
  TouchableOpacity,
} from "react-native";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { logOut } from "@/store/auth/authThunk";
import OptionItem from "@/components/auth/OptionItem";
import Ionicons from "@expo/vector-icons/Ionicons";
import { scale } from "@/utils/responsive";
import { useRouter } from "expo-router";

export default function SettingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const handleOnLogout = async () => {
    try {
      await dispatch(logOut()).unwrap();
      ToastAndroid.show("Đăng xuất thành công", ToastAndroid.SHORT);
    } catch (error: any) {
      ToastAndroid.show(error || "Lỗi hệ thống !", ToastAndroid.SHORT);
    }
  };

  const handleOnPressPassword = () => {
    router.push("/private/change-password");
  };

  return (
    <Container>
      <Header
        gradient
        centerChild={
          <Text className="text-white font-semibold text-sm">Cài đặt</Text>
        }
        back
      />
      <ScrollView className="px-screen-edge">
        {/* Đăng xuất */}
        <View>
          <View>
            <OptionItem
              onPress={handleOnPressPassword}
              className=" gap-4 border-b-[0.2px] border-gray-400 py-4"
              icon="arrow-forward"
            >
              <Ionicons
                name="lock-closed-outline"
                size={scale(20)}
                color="black"
              />
              <Text className="text-sm">Mật khẩu</Text>
            </OptionItem>
          </View>

          <Button
            className={`${loading ? "bg-secondary/60" : "bg-secondary"} w-full my-2 py-3 gap-3 flex flex-row justify-center`}
            onPress={handleOnLogout}
            disabled={loading}
          >
            <SimpleLineIcons name="logout" size={24} color="black" />
            <Text className="text-base font-semibold">Đăng xuất</Text>
          </Button>
        </View>
      </ScrollView>
    </Container>
  );
}
