import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Visibility } from "../../types/social.type";

interface Props {
    visibility: Visibility;
    canPost: boolean;
    onBack: () => void;
    onPost: () => void;
    onFont?: () => void;
    onChangeVisibility?: () => void;
}

const LABEL: Record<Visibility, string> = {
    PUBLIC: "Công khai",
    FRIENDS: "Bạn bè",
    PRIVATE: "Chỉ mình tôi",
};

const DESC: Record<Visibility, string> = {
    PUBLIC: "Ai cũng có thể xem",
    FRIENDS: "Trừ bạn bè đã bị chặn xem",
    PRIVATE: "Chỉ mình bạn xem",
};

const ICON: Record<Visibility, any> = {
    PUBLIC: "earth",
    FRIENDS: "people",
    PRIVATE: "lock-closed",
};

export default function PostHeader({
    visibility,
    canPost,
    onBack,
    onPost,
    onFont,
    onChangeVisibility
}: Props) {
    return (
        <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 0.5,
            borderBottomColor: "#ddd",
        }}>
            {/* Back */}
            <Pressable onPress={onBack} style={{ padding: 4 }}>
                <Ionicons name="arrow-back" size={22} color="#333" />
            </Pressable>

            {/* Visibility */}
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Pressable
                    onPress={onChangeVisibility}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                    <Ionicons name={ICON[visibility]} size={16} color="#555" />
                    <Text style={{ fontSize: 15, fontWeight: "700" }}>
                        {LABEL[visibility]}
                    </Text>
                    <Ionicons name="caret-down" size={14} color="#0068FF" />
                </Pressable>

                {/* 👇 FIX: hiển thị theo từng mode */}
                <Text style={{ fontSize: 11, color: "#999" }}>
                    {DESC[visibility]}
                </Text>
            </View>

            {/* Font */}
            <Pressable
                onPress={onFont}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#0068FF",
                    borderRadius: 20,
                    paddingHorizontal: 4,
                    paddingVertical: 3,
                    marginRight: 10,
                }}
            >
                <View style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                }}>
                    <Text style={{ color: "#0068FF", fontWeight: "700" }}>Aa</Text>
                </View>
                <Ionicons name="pencil" size={14} color="#fff" />
            </Pressable>

            {/* Post */}
            <Pressable onPress={onPost} disabled={!canPost}>
                <Text style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: canPost ? "#0068FF" : "#bbb",
                }}>
                    Đăng
                </Text>
            </Pressable>
        </View>
    );
}