import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { showToast } from "@/utils/toast";
import { logOut } from "@/store/auth/authThunk";
import OptionItem from "@/components/auth/OptionItem";
import Button from "@/components/common/Button";
import { scale } from "@/utils/responsive";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  SimpleLineIcons
} from "@expo/vector-icons";
import { useSocket } from "@/contexts/SocketContext";
import { useEffect } from "react";
import { fetchUserById } from "@/store/auth/userInfoSlice";

export default function Personal() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);
  const { userInfo } = useAppSelector((state) => state.userInfo);
  const { profileRefreshKey } = useSocket();

  useEffect(() => {
    if (user?.userId) {
      dispatch(fetchUserById(user.userId));
    }
  }, [dispatch, user?.userId, profileRefreshKey]);

  const handleOnLogout = async () => {
    try {
      await dispatch(logOut()).unwrap();
      showToast("Đăng xuất thành công");
    } catch (error: any) {
      showToast(error || "Lỗi hệ thống !");
    }
  };

  const handleOnPressPassword = () => {
    router.push("/private/change-password");
  };

  const handleOnPressProfile = () => {
    router.push("/private/profile");
  };

  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
      />

      <ScrollView className="flex-1 bg-[#f7f8fa]" showsVerticalScrollIndicator={false}>
        <View className="px-screen-edge pb-10">
          {/* Tiêu đề */}
          <View className="pt-6 pb-2">
            <Text className="text-blue-800 text-xl font-bold">Tài khoản</Text>
          </View>

          {/* Thẻ Thông tin cá nhân */}
          <TouchableOpacity
            onPress={handleOnPressProfile}
            className="mt-2 mb-4 flex-row items-center p-4 border border-gray-100 rounded-md bg-white shadow-sm"
          >
            <Image
              source={{
                uri: userInfo?.profile?.avatarUrl
                  ? userInfo.profile.avatarUrl
                  : "https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_4_aefd38b259.jpg",
              }}
              className="w-16 h-16 rounded-full"
            />
            <View className="flex-1 ml-4">
              <Text className="text-gray-500 text-[13px] mb-1">
                Thông tin cá nhân
              </Text>
              <Text className="text-black text-lg font-semibold">
                {userInfo?.profile?.name || "Chưa cập nhật"}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="bg-white rounded-md overflow-hidden border border-gray-100 shadow-sm">
            {/* Số điện thoại */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-300 py-4 px-4"
              icon="arrow-forward"
            >
              <Feather name="phone" size={scale(20)} color="black" />
              <View className="flex-1">
                <Text className="text-sm text-black">Số điện thoại</Text>
                <Text className="text-gray-500 text-xs mt-1">
                  (+84) {userInfo?.phone || "Chưa cập nhật"}
                </Text>
              </View>
            </OptionItem>

            {/* Email */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-300 py-4 px-4"
              icon="arrow-forward"
            >
              <Feather name="mail" size={scale(20)} color="black" />
              <View className="flex-1">
                <Text className="text-sm text-black">Email</Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {userInfo?.email ? userInfo?.email : "Chưa liên kết"}
                </Text>
              </View>
            </OptionItem>

            {/* Mã QR của tôi */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-300 py-4 px-4"
              icon="arrow-forward"
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={scale(20)}
                color="black"
              />
              <Text className="text-sm text-black flex-1">Mã QR của tôi</Text>
            </OptionItem>

            {/* Thiết bị đăng nhập */}
            <OptionItem
              onPress={() => router.push("/private/sessions")}
              className="gap-4 border-b-[0.2px] border-gray-300 py-4 px-4"
              icon="arrow-forward"
            >
              <MaterialCommunityIcons
                name="devices"
                size={scale(20)}
                color="black"
              />
              <Text className="text-sm text-black flex-1">Thiết bị đăng nhập</Text>
            </OptionItem>

            {/* Mật khẩu */}
            <OptionItem
              onPress={handleOnPressPassword}
              className="gap-4 py-4 px-4"
              icon="arrow-forward"
            >
              <Ionicons
                name="lock-closed-outline"
                size={scale(20)}
                color="black"
              />
              <Text className="text-sm text-black flex-1">Mật khẩu</Text>
            </OptionItem>
          </View>

          {/* Nút Đăng xuất */}
          <Button
            className={`${loading ? "bg-secondary/60" : "bg-secondary"
              } w-full mt-8 mb-4 py-3.5 gap-3 flex flex-row justify-center rounded-2xl`}
            onPress={handleOnLogout}
            disabled={loading}
          >
            <SimpleLineIcons name="logout" size={20} color="black" />
            <Text className="text-base font-semibold">Đăng xuất</Text>
          </Button>
        </View>
      </ScrollView>
    </Container>
  );
}
