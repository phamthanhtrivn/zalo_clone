import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface QuickActionsProps {
    onAlbum: () => void;
    onFriends: () => void;
    onMusic: () => void;
    onFont: () => void;
}

export default function QuickActions({ onAlbum, onFriends, onMusic, onFont }: QuickActionsProps) {
    return (
        <>
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <Pressable
                    onPress={onFont}
                    style={{
                        width: 48, height: 48,
                        borderRadius: 24,
                        backgroundColor: "#fff",
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                    <Text style={{ fontWeight: "800", fontSize: 18, color: "#333" }}>Aa</Text>
                </Pressable>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 10, paddingBottom: 14 }}
            >
                <Chip icon="musical-notes-outline" label="Nhạc" onPress={onMusic} />
                <Chip icon="images-outline" label="Album" onPress={onAlbum} />
                <Chip icon="pricetag-outline" label="Với bạn bè" onPress={onFriends} />
            </ScrollView>
        </>
    );
}

function Chip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                borderWidth: 1, borderColor: "#e5e7eb",
                borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: "#fff",
            }}
        >
            <Ionicons name={icon as any} size={17} color="#555" />
            <Text style={{ fontSize: 14, color: "#333", fontWeight: "500" }}>{label}</Text>
        </Pressable>
    );
}
