import { ScrollView, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

type Story = {
  id: string;
  authorId: string;
  userName: string;
  userAvatar: string;
  mediaUri?: string;
  text?: string;
  mediaType?: "IMAGE" | "VIDEO" | "TEXT";
  hoursAgo: string;
  storiesJson: string;
  startIndex: number;
  groupsJson: string;
  groupIndex: number;
};

export default function StoriesStrip({
  onCreateStory,
  onOpenStory,
  stories,
  currentUserAvatar,
}: {
  onCreateStory?: () => void;
  onOpenStory?: (story: Story) => void;
  stories?: any[];
  currentUserAvatar?: string | null;
}) {
  const groupsJson = JSON.stringify(stories || []);

  const feedStories: Story[] = (stories || [])
    .map((g: any, groupIndex: number) => {
      const first = (g.stories || [])[0];
      if (!first) return null;

      const createdAt = first?.createdAt
        ? new Date(first.createdAt).getTime()
        : Date.now();
      const diffHours = Math.max(
        1,
        Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)),
      );

      return {
        id: first?.id || g.authorId,
        authorId: g.authorId,
        userName: g.userName || "User",
        userAvatar:
          g.userAvatar ||
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        mediaUri: first.mediaUri || "",
        text: first.text || "",
        mediaType: first.mediaType || (first.mediaUri ? "IMAGE" : "TEXT"),
        hoursAgo: `${diffHours} giờ`,
        storiesJson: JSON.stringify(g.stories || []),
        startIndex: 0,
        groupsJson,
        groupIndex,
      };
    })
    .filter(Boolean) as Story[];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-white px-4 py-3"
    >
      <Pressable
        onPress={onCreateStory}
        className="w-[120px] h-[160px] rounded-2xl overflow-hidden mr-3 bg-black"
      >
        <Image
          source={{
            uri:
              currentUserAvatar ||
              "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9",
          }}
          style={{ width: "100%", height: "100%" }}
        />
        <View className="absolute inset-0 bg-black/35" />
        <View className="absolute left-0 right-0 top-[48px] items-center">
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#fff",
              overflow: "hidden",
            }}
          >
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <LinearGradient
                colors={["#4f8cff", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            )}
          </View>
        </View>
        <View className="absolute bottom-2 left-0 right-0 items-center">
          <Text className="text-white font-semibold text-[18px]">Tạo mới</Text>
        </View>
      </Pressable>

      {feedStories.map((story) => (
        <Pressable
          key={story.id}
          onPress={() => onOpenStory?.(story)}
          className="w-[120px] h-[160px] rounded-2xl overflow-hidden bg-black mr-3"
        >
          {story.mediaUri ? (
            <Image
              source={{ uri: story.mediaUri }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View className="w-full h-full bg-[#1f2937] items-center justify-center px-2">
              <Text numberOfLines={5} className="text-white text-[13px] text-center">
                {story.text || "Story chữ"}
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/35" />
          <View className="absolute top-3 left-3 w-9 h-9 rounded-full border-2 border-white overflow-hidden">
            <Image
              source={{ uri: story.userAvatar }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View className="absolute bottom-2 left-2 right-2">
            <Text numberOfLines={1} className="text-white font-semibold text-[16px]">
              {story.userName}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
