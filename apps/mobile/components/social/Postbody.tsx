import React from "react";
import { View, Text, TextInput, ScrollView, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Friend, Location } from "../../types/social.type";

interface FontStyle {
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
}

interface Music {
    id: string;
    title: string;
    artist: string;
    duration: string;
}

interface Props {
    text: string;
    onChangeText: (v: string) => void;
    selectedImages: string[];
    onRemoveImage: (index: number) => void;
    selectedFriends: Friend[];
    selectedLocation: Location | null;
    onRemoveLocation: () => void;
    // ✅ Thêm props mới
    fontStyle?: FontStyle | null;
    fontColor?: string;
    selectedMusic?: Music | null;
    onRemoveMusic?: () => void;
}

export default function PostBody({
    text,
    onChangeText,
    selectedImages,
    onRemoveImage,
    selectedFriends,
    selectedLocation,
    onRemoveLocation,
    fontStyle,
    fontColor,
    selectedMusic,
    onRemoveMusic,
}: Props) {
    return (
        <>
            {/* Text input với font style và màu chữ */}
            <TextInput
                value={text}
                onChangeText={onChangeText}
                placeholder="Bạn đang nghĩ gì?"
                placeholderTextColor="#bbb"
                multiline
                style={{
                    fontSize: 17,
                    color: fontColor || "#111", // ✅ Áp dụng màu chữ
                    fontWeight: fontStyle?.fontWeight || "normal", // ✅ Áp dụng kiểu chữ
                    fontStyle: fontStyle?.fontStyle || "normal", // ✅ Áp dụng in nghiêng
                    paddingHorizontal: 16,
                    paddingTop: 14,
                    paddingBottom: 10,
                    minHeight: 120,
                    textAlignVertical: "top",
                }}
            />

            {/* ✅ Hiển thị music đã chọn */}
            {selectedMusic && (
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 16,
                    marginBottom: 10,
                    backgroundColor: "#f0f7ff",
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#d0e3ff",
                }}>
                    {/* Music icon */}
                    <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#e3f0ff",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                    }}>
                        <Ionicons name="musical-note" size={20} color="#0068FF" />
                    </View>

                    {/* Music info */}
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#333",
                        }}>
                            {selectedMusic.title}
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            color: "#666",
                            marginTop: 2,
                        }}>
                            {selectedMusic.artist} • {selectedMusic.duration}
                        </Text>
                    </View>

                    {/* Remove button */}
                    {onRemoveMusic && (
                        <Pressable
                            onPress={onRemoveMusic}
                            style={{ padding: 4 }}
                        >
                            <Ionicons name="close-circle" size={22} color="#999" />
                        </Pressable>
                    )}
                </View>
            )}

            {/* Selected images preview row */}
            {selectedImages.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}
                >
                    {selectedImages.map((uri, i) => (
                        <View key={i} style={{ position: "relative" }}>
                            <Image
                                source={{ uri }}
                                style={{ width: 100, height: 100, borderRadius: 8 }}
                            />
                            <Pressable
                                onPress={() => onRemoveImage(i)}
                                style={{
                                    position: "absolute", top: 4, right: 4,
                                    backgroundColor: "rgba(0,0,0,0.55)",
                                    borderRadius: 10, width: 20, height: 20,
                                    alignItems: "center", justifyContent: "center",
                                }}
                            >
                                <Ionicons name="close" size={12} color="#fff" />
                            </Pressable>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* ✅ Hiển thị font style indicator nếu có */}
            {(fontStyle || fontColor) && (
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 16,
                    marginBottom: 8,
                    gap: 8,
                }}>
                    {fontStyle && (
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#f0f0f0",
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            gap: 4,
                        }}>
                            <Text style={{ fontSize: 13, color: "#666" }}>
                                {fontStyle.fontWeight === "bold" && fontStyle.fontStyle === "italic"
                                    ? "Đậm nghiêng"
                                    : fontStyle.fontWeight === "bold"
                                        ? "In đậm"
                                        : fontStyle.fontStyle === "italic"
                                            ? "In nghiêng"
                                            : "Bình thường"
                                }
                            </Text>
                        </View>
                    )}
                    {fontColor && (
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#f0f0f0",
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            gap: 6,
                        }}>
                            <View style={{
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: fontColor,
                                borderWidth: 1,
                                borderColor: "#ddd",
                            }} />
                            <Text style={{ fontSize: 13, color: "#666" }}>Màu chữ</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Location badge */}
            {selectedLocation && (
                <View style={{
                    flexDirection: "row", alignItems: "center",
                    marginHorizontal: 16, marginBottom: 10,
                    backgroundColor: "#f0f4ff", borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 6,
                    alignSelf: "flex-start", gap: 6,
                }}>
                    <Ionicons name="location" size={14} color="#0068FF" />
                    <Text style={{ fontSize: 13, color: "#0068FF", fontWeight: "500" }}>
                        {selectedLocation.name}
                    </Text>
                    <Pressable onPress={onRemoveLocation}>
                        <Ionicons name="close" size={14} color="#0068FF" />
                    </Pressable>
                </View>
            )}

            {/* Tagged friends */}
            {selectedFriends.length > 0 && (
                <View style={{
                    flexDirection: "row", flexWrap: "wrap",
                    marginHorizontal: 16, marginBottom: 10, gap: 6,
                }}>
                    {selectedFriends.map(f => (
                        <View key={f.id} style={{
                            flexDirection: "row", alignItems: "center", gap: 4,
                            backgroundColor: "#e8f0fe", borderRadius: 20,
                            paddingHorizontal: 8, paddingVertical: 4,
                        }}>
                            <Image source={{ uri: f.avatar }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                            <Text style={{ fontSize: 12, color: "#0068FF" }}>{f.name}</Text>
                        </View>
                    ))}
                </View>
            )}
        </>
    );
}