import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import {
  ScrollView,
  Text,
  View,
  Image,
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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { use, useEffect, useState } from "react";
import { userService } from "@/services/user.service";

export default function SettingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector((state) => state.auth);
  const { userInfo } = useAppSelector((state) => state.userInfo);

  console.log("userInfo : ", userInfo);

<<<<<<< HEAD
  // useEffect(() => {
  //   if (!user?.userId) return;

  //   const getUserInfo = async () => {
  //     try {
  //       const data = await userService.getProfile(user.userId);
  //       console.log(data);

  //       setUserInfo(data);
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   getUserInfo();
  // }, [user]);
=======
>>>>>>> 30cf414fe9680fb67fe94f458295ad0a4eacf8dd

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

  const handleOnPressProfile = () => {
    router.push("/private/profile");
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
        <View className="flex-1 pb-10">
          {/* Tiêu đề */}
          <View className="pt-6 pb-2">
            <Text className="text-blue-800 text-xl font-bold">Tài khoản</Text>
          </View>

          {/* Thẻ Thông tin cá nhân */}
          <TouchableOpacity
            onPress={handleOnPressProfile}
            className="mt-2 mb-4 flex-row items-center p-4 border border-gray-200 rounded-2xl bg-white"
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
              <Text className="text-gray-500 text-sm mb-1">
                Thông tin cá nhân
              </Text>
              <Text className="text-black text-lg font-semibold">
                {userInfo?.profile?.name}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View>
            {/* Số điện thoại */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-400 py-4"
              icon="arrow-forward"
            >
              <Feather name="phone" size={scale(20)} color="black" />
              <View className="flex-1">
                <Text className="text-sm text-black">Số điện thoại</Text>
                <Text className="text-gray-500 text-xs mt-1">
                  (+84) {userInfo?.phone}
                </Text>
              </View>
            </OptionItem>

            {/* Email */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-400 py-4"
              icon="arrow-forward"
            >
              <Feather name="mail" size={scale(20)} color="black" />
              <View className="flex-1">
                <Text className="text-sm text-black">Email</Text>

                <Text className="text-gray-500 text-xs mt-1">
                  {
                    userInfo?.email ? userInfo?.email : "Chưa liên kết"
                  }
                </Text>
              </View>
            </OptionItem>

            {/* Mã QR của tôi */}
            <OptionItem
              className="gap-4 border-b-[0.2px] border-gray-400 py-4"
              icon="arrow-forward"
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={scale(20)}
                color="black"
              />
              <Text className="text-sm text-black flex-1">Mã QR của tôi</Text>
            </OptionItem>

            {/* Mật khẩu */}
            <OptionItem
              onPress={handleOnPressPassword}
              className="gap-4 border-b-[0.2px] border-gray-400 py-4"
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
            className={`${
              loading ? "bg-secondary/60" : "bg-secondary"
            } w-full mt-8 mb-4 py-3 gap-3 flex flex-row justify-center`}
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
