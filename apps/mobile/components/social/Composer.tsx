import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

type StoryMode = "camera" | "image" | "video" | "album" | "text";

type Props = {
  avatar?: string | null;
  onOpenStoryCreator?: (mode: StoryMode) => void;
};

export default function Composer({ avatar, onOpenStoryCreator }: Props) {
  return (
    <View className="bg-white px-4 pt-4 pb-3">
      <Pressable
        onPress={() => onOpenStoryCreator?.("camera")}
        className="flex-row items-center"
      >
        <Image
          source={{
            uri:
              avatar ||
              "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9",
          }}
          style={{ width: 50, height: 50, borderRadius: 25 }}
        />
        <Text className="ml-3 text-gray-500 text-[16px]">Hôm nay bạn thế nào?</Text>
      </Pressable>

      <View className="flex-row mt-4 justify-between">
        <Pressable
          onPress={() => onOpenStoryCreator?.("image")}
          className="flex-row items-center bg-[#f3f4f6] rounded-full px-3 py-2"
        >
          <Ionicons name="image-outline" size={20} color="#22c55e" />
          <Text className="ml-1.5 text-[16px]">Ảnh</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenStoryCreator?.("video")}
          className="flex-row items-center bg-[#f3f4f6] rounded-full px-3 py-2"
        >
          <Ionicons name="videocam-outline" size={20} color="#d946ef" />
          <Text className="ml-1.5 text-[16px]">Video</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenStoryCreator?.("album")}
          className="flex-row items-center bg-[#f3f4f6] rounded-full px-3 py-2"
        >
          <MaterialIcons name="photo-library" size={20} color="#2563eb" />
          <Text className="ml-1.5 text-[16px]">Album</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenStoryCreator?.("text")}
          className="flex-row items-center bg-[#f3f4f6] rounded-full px-3 py-2"
        >
          <Ionicons name="brush-outline" size={20} color="#0284c7" />
          <Text className="ml-1.5 text-[16px]">Nền chữ</Text>
        </Pressable>
      </View>
    </View>
  );
}
