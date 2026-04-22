import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { EMOJI_MAP, type EmojiType } from "@/constants/emoji.constant";
import type { ReactionType } from "@/types/messages.type";

interface Props {
  reactions: ReactionType[];
  onClick: (reactions: ReactionType[]) => void;
}

const ReactionSummary: React.FC<Props> = ({ reactions, onClick }) => {
  if (!reactions || reactions.length === 0) return null;

  const { emojiCountMap, totalQuantity } = reactions.reduce(
    (acc, r) => {
      r.emoji.forEach((e) => {
        acc.emojiCountMap[e.name] = (acc.emojiCountMap[e.name] || 0) + e.quantity;
        acc.totalQuantity += e.quantity;
      });
      return acc;
    },
    { emojiCountMap: {} as Record<string, number>, totalQuantity: 0 }
  );

  const sortedEmojis = Object.entries(emojiCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return (
    <TouchableOpacity
      onPress={() => onClick(reactions)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        alignSelf: "flex-start",
        gap: 2,
        borderWidth: 1,
        borderColor: "#f3f4f6",
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {sortedEmojis.slice(0, 3).map((name, i) => (
          <Text key={i} style={{ fontSize: 12 }}>
            {EMOJI_MAP[name as EmojiType] || name}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>
        {totalQuantity}
      </Text>
    </TouchableOpacity>
  );
};

export default ReactionSummary;
