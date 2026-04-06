import Container from "@/components/common/Container";
import { Text, ScrollView, Image, View, TouchableOpacity } from "react-native";
import Header from "@/components/common/Header";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/store";
import formatBirthday from "@/helper/formatBirthday";

export default function ProfileScreen() {
  const router = useRouter();
  const { userInfo } = useAppSelector((state) => state.userInfo);

  const editEditProfile = () => {
    router.push("/private/update-profile");
  };

  return (
    <Container>
      <Header
        gradient
        centerChild={
          <Text className="text-white font-semibold text-sm">
            Thông tin cái nhân
          </Text>
        }
        back
      />

      <ScrollView className="flex-1 bg-white">
        {/* Phần Avatar */}
        <View className="items-center mt-8 mb-6">
          <Image
            source={{
              uri: userInfo?.profile?.avatarUrl
                ? userInfo.profile.avatarUrl
                : "https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_4_aefd38b259.jpg",
            }}
            className="w-28 h-28 rounded-full"
          />
        </View>

        {/* Danh sách thông tin */}
        <View className="px-4">
          {/* Tên Zalo */}
          <View className="flex-row items-center py-4 border-b border-gray-100">
            <Ionicons name="person-circle-outline" size={26} color="#6B7280" />
            <Text className="text-gray-600 text-[16px] ml-4 flex-1">
              Tên Zalo
            </Text>
            <Text className="text-black text-[16px] font-medium">
              {userInfo?.profile?.name}
            </Text>
          </View>

          {/* Ngày sinh */}
          <View className="flex-row items-center py-4 border-b border-gray-100">
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={24}
              color="#6B7280"
            />
            <Text className="text-gray-600 text-[16px] ml-4 flex-1">
              Ngày sinh
            </Text>
            <Text className="text-black text-[16px] font-medium">
              {formatBirthday(new Date(userInfo?.profile?.birthday))}
            </Text>
          </View>

          {/* Giới tính */}
          <View className="flex-row items-center py-4 border-b border-gray-100">
            <Ionicons name="person-outline" size={24} color="#6B7280" />
            <Text className="text-gray-600 text-[16px] ml-4 flex-1">
              Giới tính
            </Text>
            <Text className="text-black text-[16px] font-medium">
              {userInfo?.profile?.gender === "MALE" ? "Nam" : "Nữ"}
            </Text>
          </View>
        </View>

        {/* Nút Chỉnh sửa */}
        <View className="px-4 mt-6 pb-6">
          <TouchableOpacity
            onPress={editEditProfile}
            className="bg-[#F3F4F6] flex-row justify-center items-center py-3 rounded-full gap-2"
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color="black"
            />
            <Text className="text-black text-[16px] font-medium">
              Chỉnh sửa
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
}
