import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { COLORS } from "@/constants/colors";
import type { MessagesType } from "@/types/messages.type";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PinnedMessagesBarProps {
  pinnedMessages: MessagesType[];
  onUnpin: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pinnedMessages,
  onUnpin,
  onJumpToMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  const first = pinnedMessages[0];
  const remaining = pinnedMessages.length - 1;

  const getPreviewText = (msg: MessagesType) => {
    if (msg.content.text) return msg.content.text;
    if (msg.content.icon) return "Biểu cảm";

    if (msg.content.files && msg.content.files.length > 0)
      return msg.content.files[msg.content.files.length - 1].fileName;
    return "Tin nhắn";
  };

  return (
    <View
      style={{
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 50,
      }}
    >
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          onPress={() => onJumpToMessage(first._id)}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#E5F1FF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <MaterialCommunityIcons name="pin" size={18} color="#0068FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#0068FF" }}
              numberOfLines={1}
            >
              Ghim: {getPreviewText(first)}
            </Text>
            {remaining > 0 && !isOpen && (
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                Có {remaining} tin nhắn ghim khác
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {remaining > 0 && (
            <TouchableOpacity
              onPress={toggleOpen}
              style={{
                backgroundColor: isOpen ? "#0068FF" : "#F3F4F6",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 15,
                flexDirection: "row",
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isOpen ? "white" : "#666",
                }}
              >
                {isOpen ? "Thu gọn" : `Xem ${remaining} ghim`}
              </Text>
              <MaterialCommunityIcons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={isOpen ? "white" : "#666"}
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>
          )}
          {!isOpen && (
            <TouchableOpacity
              onPress={() => onUnpin(first._id)}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={22}
                color="#9ca3af"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MODAL EXPANDED LIST */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={toggleOpen}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
          onPress={toggleOpen}
        >
          <Pressable
            style={{
              width: "100%",
              backgroundColor: "white",
              borderRadius: 20,
              maxHeight: "70%",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 10,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>
                Danh sách tin nhắn ghim
              </Text>
              <TouchableOpacity onPress={toggleOpen}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {pinnedMessages.map((msg, index) => (
                <View
                  key={msg._id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth:
                      index === pinnedMessages.length - 1 ? 0 : 1,
                    borderBottomColor: "#f9fafb",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                    onPress={() => {
                      onJumpToMessage(msg._id);
                      setIsOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#111",
                        }}
                      >
                        {msg.senderId.profile.name}
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: "#666" }}
                        numberOfLines={2}
                      >
                        {getPreviewText(msg)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onUnpin(msg._id)}
                    style={{ padding: 10 }}
                  >
                    <MaterialCommunityIcons
                      name="pin-off-outline"
                      size={20}
                      color="#f87171"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default PinnedMessagesBar;
