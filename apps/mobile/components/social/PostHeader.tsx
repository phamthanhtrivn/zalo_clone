import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Visibility } from "../../types/social.type";

interface Props {
    visibility: Visibility;
    canPost: boolean;
    posting?: boolean;
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
    posting = false,
    onBack,
    onPost,
    onFont,
    onChangeVisibility
}: Props) {
    return (
        <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: "#e5e7eb",
            backgroundColor: "#fff",
        }}>
            {/* Back */}
            <Pressable onPress={onBack} style={{ padding: 4 }}>
                <Ionicons name="arrow-back" size={22} color="#333" />
            </Pressable>

            {/* Visibility */}
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Pressable
                    onPress={onChangeVisibility}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                    <Ionicons name={ICON[visibility]} size={16} color="#555" />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
                        {LABEL[visibility]}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#6b7280" />
                </Pressable>

                <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {DESC[visibility]}
                </Text>
            </View>

            {/* Font */}
            <Pressable
                onPress={onFont}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#1398ff",
                    borderRadius: 999,
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    marginRight: 12,
                }}
            >
                <View style={{
                    backgroundColor: "#fff",
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                }}>
                    <Text style={{ color: "#1398ff", fontWeight: "700", fontSize: 16 }}>Aa</Text>
                </View>
                <View style={{ paddingHorizontal: 10 }}>
                    <Ionicons name="brush" size={16} color="#fff" />
                </View>
            </Pressable>

            {/* Post */}
            <Pressable onPress={onPost} disabled={!canPost || posting}>
                <Text style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: canPost && !posting ? "#0068FF" : "#c7c9d1",
                }}>
                    {posting ? "Dang..." : "Dang"}
                </Text>
            </Pressable>
        </View>
    );
}
