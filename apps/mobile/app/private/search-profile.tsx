import Container from "@/components/common/Container";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ImageBackground, Text, TouchableOpacity, View } from "react-native";

type RelationshipStatus =
  | "NONE"
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "BLOCKED"
  | "BLOCKED_BY_OTHER"
  | "REJECTED";

function parseRelationshipStatus(value?: string): RelationshipStatus {
  if (value === "PENDING") return "REQUESTED";
  if (value === "REQUESTED") return "PENDING";
  if (value === "ACCEPTED") return "ACCEPTED";
  if (value === "BLOCKED") return "BLOCKED";
  if (value === "BLOCKED_BY_OTHER") return "BLOCKED_BY_OTHER";
  if (value === "REJECTED") return "REQUESTED";
  return "NONE";
}

function formatPhoneForDisplay(phone?: string): string {
  if (!phone) return "";
  if (phone.startsWith("84")) return `(+84) ${phone.slice(2)}`;
  if (phone.startsWith("0")) return `(+84) ${phone.slice(1)}`;
  return `(+84) ${phone}`;
}

export default function SearchProfileScreen() {
  const router = useRouter();
  const { phone, status, name, avatarUrl } = useLocalSearchParams<{
    phone?: string;
    status?: string;
    name?: string;
    avatarUrl?: string;
  }>();

  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(
    parseRelationshipStatus(status),
  );

  const profileName = useMemo(() => {
    if (typeof name !== "string") return "Người dùng";
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : "Người dùng";
  }, [name]);

  const profileAvatar = useMemo(() => {
    if (typeof avatarUrl !== "string") return "";
    return avatarUrl;
  }, [avatarUrl]);

  const profileCover = useMemo(() => {
    return (
      profileAvatar ||
      "https://images.unsplash.com/photo-1615567808141-0f9b6224d4d9?q=80&w=1800&auto=format&fit=crop"
    );
  }, [profileAvatar]);

  const isFriend = relationshipStatus === "ACCEPTED";

  const phoneDisplay = useMemo(() => formatPhoneForDisplay(phone), [phone]);

  const description = isFriend
    ? `${profileName} đã là bạn bè của bạn.`
    : `Bạn chưa thể xem nhật ký của ${profileName} khi chưa là bạn bè`;

  const handlePrimaryAction = () => {
    if (relationshipStatus === "REQUESTED") {
      setRelationshipStatus("ACCEPTED");
      return;
    }

    if (relationshipStatus === "NONE") {
      setRelationshipStatus("PENDING");
    }
  };

  return (
    <Container className="bg-[#f0f0f5]">
      <View className="flex-1 bg-[#f0f0f5]">
        <View className="relative">
          <ImageBackground
            source={{ uri: profileCover }}
            className="h-[335px] w-full"
            resizeMode="cover"
          >
            <View className="absolute inset-0 bg-black/15" />

            <View className="pt-2 px-4 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-black/20 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <TouchableOpacity className="w-10 h-10 rounded-full bg-black/20 items-center justify-center mr-2">
                  <Ionicons name="call-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-black/20 items-center justify-center">
                  <Ionicons name="ellipsis-horizontal" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="absolute top-20 left-4 bg-black/25 rounded-lg px-2 py-1 flex-row items-center">
              <Image
                source={{
                  uri:
                    profileAvatar ||
                    "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?q=80&w=800&auto=format&fit=crop",
                }}
                className="w-9 h-9 rounded"
              />
              <Text className="text-white text-[15px] font-semibold ml-2 max-w-[170px]" numberOfLines={1}>
                {profileName}
              </Text>
            </View>
          </ImageBackground>

          <View className="absolute -bottom-16 left-0 right-0 items-center">
            <Image
              source={{
                uri:
                  profileAvatar ||
                  "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?q=80&w=800&auto=format&fit=crop",
              }}
              className="w-40 h-40 rounded-full border-[5px] border-white"
            />
          </View>
        </View>

        <View className="pt-20 px-6 items-center">
          <View className="flex-row items-center">
            <Text className="text-[18px] font-semibold text-[#1f2937]">{profileName}</Text>
            <Ionicons name="pencil-outline" size={20} color="#111827" style={{ marginLeft: 8 }} />
          </View>

          {!!phoneDisplay && (
            <Text className="text-[14px] text-gray-500 mt-2">{phoneDisplay}</Text>
          )}

          <Text className="text-[16px] text-gray-500 text-center mt-7 leading-6 px-1">{description}</Text>

          <View className="w-full mt-6 flex-row items-center">
            <TouchableOpacity
              className={`h-14 rounded-full items-center justify-center flex-row ${
                isFriend ? "w-full bg-[#dbeafe]" : "flex-1 bg-[#dbeafe]"
              }`}
              onPress={() => router.push("/private/chat")}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#0a67d8" />
              <Text className="text-[#0a67d8] text-[16px] font-semibold ml-3">Nhắn tin</Text>
            </TouchableOpacity>

            {!isFriend && (
              <TouchableOpacity
                onPress={handlePrimaryAction}
                className="ml-3 h-14 min-w-[88px] px-4 rounded-full bg-white border border-gray-100 items-center justify-center"
              >
                {relationshipStatus === "PENDING" ? (
                  <Text className="text-[13px] font-semibold text-gray-500">ĐÃ GỬI</Text>
                ) : relationshipStatus === "REQUESTED" ? (
                  <Text className="text-[13px] font-semibold text-[#0091ff]">ĐỒNG Ý</Text>
                ) : (
                  <Ionicons name="person-add-outline" size={26} color="#111827" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Container>
  );
}
