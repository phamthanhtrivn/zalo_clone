import React, { useState } from "react";
import {
    Modal, View, Text, TextInput, Image,
    ScrollView, Pressable, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Friend } from "../types";
import { COLORS } from "@/constants/colors";

interface Props {
    visible: boolean;
    friends: Friend[];
    loading?: boolean;
    onToggle: (id: string) => void;
    onClose: () => void;
    onConfirm: () => void;
}

export default function FriendsSheet({ visible, friends, loading, onToggle, onClose, onConfirm }: Props) {
    const [search, setSearch] = useState("");

    const filtered = friends.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce<Record<string, Friend[]>>((acc, f) => {
        const letter = f.name[0].toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(f);
        return acc;
    }, {});

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                {/* Header */}
                <View style={{
                    flexDirection: "row", alignItems: "center",
                    paddingHorizontal: 12, paddingVertical: 12,
                    borderBottomWidth: 0.5, borderBottomColor: "#ddd",
                }}>
                    <Pressable onPress={onClose} style={{ padding: 4 }}>
                        <Ionicons name="arrow-back" size={22} color="#333" />
                    </Pressable>
                    <Text style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#000" }}>
                        Bạn được đánh dấu
                    </Text>
                    <Pressable onPress={onConfirm}>
                        <Text style={{ fontSize: 15, color: "#0068FF", fontWeight: "600" }}>TIẾP</Text>
                    </Pressable>
                </View>

                {/* Search */}
                <View style={{
                    margin: 12,
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "#f2f2f2", borderRadius: 10,
                    paddingHorizontal: 12,
                }}>
                    <Ionicons name="search" size={16} color="#aaa" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Nhập tên bạn bè"
                        placeholderTextColor="#bbb"
                        style={{ flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 14 }}
                    />
                </View>

                {/* Grouped list */}
                <ScrollView>
                    {loading && (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                    )}

                    {Object.keys(grouped).sort().map(letter => (
                        <View key={letter}>
                            <Text style={{
                                paddingHorizontal: 16, paddingVertical: 6,
                                fontSize: 13, color: "#888", fontWeight: "600",
                            }}>
                                {letter}
                            </Text>
                            {grouped[letter].map(friend => (
                                <Pressable
                                    key={friend.id}
                                    onPress={() => onToggle(friend.id)}
                                    style={{
                                        flexDirection: "row", alignItems: "center",
                                        paddingHorizontal: 16, paddingVertical: 12,
                                        borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0",
                                    }}
                                >
                                    <Image
                                        source={{ uri: friend.avatar }}
                                        style={{ width: 48, height: 48, borderRadius: 24 }}
                                    />
                                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: "#111" }}>
                                        {friend.name}
                                    </Text>
                                    <View style={{
                                        width: 24, height: 24, borderRadius: 12,
                                        borderWidth: friend.selected ? 0 : 1.5,
                                        borderColor: "#bbb",
                                        backgroundColor: friend.selected ? "#0068FF" : "transparent",
                                        alignItems: "center", justifyContent: "center",
                                    }}>
                                        {friend.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}