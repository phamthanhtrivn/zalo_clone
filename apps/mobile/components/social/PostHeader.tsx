import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Visibility } from "../types";

interface Props {
    visibility: Visibility;
    canPost: boolean;
    onBack: () => void;
    onPost: () => void;
    onFont?: () => void;
}

const LABEL: Record<Visibility, string> = {
    PUBLIC: "Công khai",
    FRIENDS: "Bạn bè Zalo",
    PRIVATE: "Chỉ mình tôi",
};

export default function PostHeader({ visibility, canPost, onBack, onPost, onFont }: Props) {
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

            {/* Group selector */}
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="people" size={16} color="#555" />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                        {LABEL[visibility]}
                    </Text>
                    <Ionicons name="caret-down" size={14} color="#0068FF" />
                </Pressable>
                <Text style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    Trừ bạn bè đã bị chặn xem
                </Text>
            </View>

            {/* Aa toggle */}
            <Pressable
                onPress={onFont}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#0068FF",
                    borderRadius: 20,
                    paddingHorizontal: 4,
                    paddingVertical: 3,
                    gap: 2,
                    marginRight: 10,
                }}>
                <View style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                }}>
                    <Text style={{ color: "#0068FF", fontWeight: "700", fontSize: 13 }}>Aa</Text>
                </View>
                <View style={{ paddingHorizontal: 6 }}>
                    <Ionicons name="pencil" size={14} color="#fff" />
                </View>
            </Pressable>

            {/* Đăng */}
            <Pressable onPress={onPost} disabled={!canPost} style={{ padding: 4 }}>
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