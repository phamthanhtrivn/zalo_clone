import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/store";
import formatBirthday from "@/utils/formatBirthday";

export default function Personal() {
  const router = useRouter();
  const { userInfo } = useAppSelector((state) => state.userInfo);

  const handleSetting = () => {
    router.push("/private/setting");
  };

  const avatarUrl =
    userInfo?.profile?.avatarUrl ||
    "https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_4_aefd38b259.jpg";

  const birthdayText = userInfo?.profile?.birthday
    ? formatBirthday(new Date(userInfo.profile.birthday))
    : "Chưa cập nhật";

  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
        rightChild={
          <TouchableOpacity onPress={handleSetting}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        }
      />

      <View className="flex-1 bg-[#f5f7fb] px-4 pt-4">
        <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <View className="flex-row items-center">
            <Image
              source={{ uri: avatarUrl }}
              className="w-20 h-20 rounded-full"
            />
            <View className="ml-4 flex-1">
              <Text className="text-[22px] font-bold text-gray-900">
                {userInfo?.profile?.name || "Chưa có tên"}
              </Text>
              <Text className="text-gray-500 mt-1">
                {userInfo?.phone ? `(+84) ${userInfo.phone}` : "Chưa có số điện thoại"}
              </Text>
            </View>
          </View>

          <View className="mt-5 space-y-3">
            <InfoRow label="Tên Zalo" value={userInfo?.profile?.name || "Chưa cập nhật"} />
            <InfoRow label="Email" value={userInfo?.email || "Chưa liên kết"} />
            <InfoRow
              label="Ngày sinh"
              value={birthdayText}
            />
            <InfoRow
              label="Giới tính"
              value={
                userInfo?.profile?.gender === "MALE"
                  ? "Nam"
                  : userInfo?.profile?.gender === "FEMALE"
                    ? "Nữ"
                    : "Chưa cập nhật"
              }
            />
          </View>
        </View>
      </View>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <Text className="text-gray-500 text-[15px]">{label}</Text>
      <Text className="text-gray-900 text-[15px] font-medium text-right flex-1 ml-4">
        {value}
      </Text>
    </View>
  );
}
