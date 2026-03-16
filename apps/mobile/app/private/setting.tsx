import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import { ScrollView, Text, View, ToastAndroid } from "react-native";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { logOut } from "@/store/auth/authThunk";

export default function SettingScreen() {
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
