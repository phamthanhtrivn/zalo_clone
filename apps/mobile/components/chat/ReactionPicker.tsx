import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import {
  REACTION_EMOJIS,
  EMOJI_MAP,
  type EmojiType,
} from "@/constants/emoji.constant";
import type { ReactionType } from "@/types/messages.type";

interface Props {
  visible: boolean;
  onClose: () => void;
  messageId: string;
  isMe: boolean;
  messageReactions: ReactionType[];
  currentUserId: string;
  onReact: (emojiType: EmojiType, messageId: string) => void;
  onRemoveReaction: (messageId: string) => void;
}

const ReactionPicker: React.FC<Props> = ({
  visible,
  onClose,
  messageId,
  isMe,
  messageReactions,
  currentUserId,
  onReact,
  onRemoveReaction,
}) => {
  const hasMyReaction =
    messageReactions.length > 0 &&
    messageReactions.some((r) => r.userId._id === currentUserId);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              position: "absolute",
              bottom: 80,
              ...(isMe ? { right: 16 } : { left: 16 }),
              backgroundColor: "white",
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 8,
              gap: 4,
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  onReact(emoji as EmojiType, messageId);
                  onClose();
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 26 }}>{EMOJI_MAP[emoji]}</Text>
              </TouchableOpacity>
            ))}
            {hasMyReaction && (
              <TouchableOpacity
                onPress={() => {
                  onRemoveReaction(messageId);
                  onClose();
                }}
                style={{
                  padding: 4,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#f3f4f6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: "#6b7280" }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ReactionPicker;
