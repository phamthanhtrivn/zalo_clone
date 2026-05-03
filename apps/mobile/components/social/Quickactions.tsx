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
            {/* Aa button */}
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <Pressable
                    onPress={onFont}
                    style={{
                        width: 46, height: 46,
                        borderRadius: 23,
                        borderWidth: 2.5,
                        borderColor: "#e0e0e0",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, color: "#333" }}>Aa</Text>
                </Pressable>
            </View>

            {/* Chip row */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 10 }}
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
                borderWidth: 1, borderColor: "#e0e0e0",
                borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                backgroundColor: "#fafafa",
            }}
        >
            <Ionicons name={icon as any} size={17} color="#555" />
            <Text style={{ fontSize: 13, color: "#333", fontWeight: "500" }}>{label}</Text>
        </Pressable>
    );
}