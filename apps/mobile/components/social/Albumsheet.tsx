import React, { useState } from "react";
import {
    Modal, View, Text, TextInput, Pressable, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface Props {
    visible: boolean;
    onClose: () => void;
    onSave: (name: string, desc: string) => void;
}

export default function AlbumSheet({ visible, onClose, onSave }: Props) {
    const [albumName, setAlbumName] = useState("");
    const [albumDesc, setAlbumDesc] = useState("");

    const handlePickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            Alert.alert("Đã chọn", `${result.assets.length} ảnh`);
        }
    };

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
                        Tạo album mới
                    </Text>
                    <Pressable onPress={() => { onSave(albumName, albumDesc); onClose(); }}>
                        <Text style={{ fontSize: 15, color: "#0068FF", fontWeight: "600" }}>LƯU</Text>
                    </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }}>
                    {/* Album name */}
                    <TextInput
                        value={albumName}
                        onChangeText={setAlbumName}
                        placeholder="Nhập tên album"
                        placeholderTextColor="#bbb"
                        style={{
                            fontSize: 22, color: "#333",
                            paddingHorizontal: 16, paddingVertical: 16,
                            borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
                        }}
                    />

                    {/* Description */}
                    <TextInput
                        value={albumDesc}
                        onChangeText={setAlbumDesc}
                        placeholder="Thêm mô tả (không bắt buộc)"
                        placeholderTextColor="#bbb"
                        multiline
                        style={{
                            fontSize: 15, color: "#333",
                            paddingHorizontal: 16, paddingVertical: 14,
                            borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0",
                            minHeight: 60, textAlignVertical: "top",
                        }}
                    />

                    {/* Visibility row */}
                    <View style={{
                        flexDirection: "row", alignItems: "center",
                        paddingHorizontal: 16, paddingVertical: 16,
                        borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0", gap: 12,
                    }}>
                        <Ionicons name="people" size={22} color="#888" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>Bạn bè Zalo</Text>
                            <Text style={{ fontSize: 12, color: "#999" }}>Trừ bạn bè đã bị chặn xem</Text>
                        </View>
                    </View>

                    {/* Theme row */}
                    <View style={{
                        flexDirection: "row", alignItems: "center",
                        paddingHorizontal: 16, paddingVertical: 16,
                        borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0", gap: 12,
                    }}>
                        <Text style={{ fontSize: 20 }}>✨</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>Chọn chủ đề trang trí</Text>
                            <Text style={{ fontSize: 12, color: "#999" }}>Làm đẹp album với các yếu tố trang trí</Text>
                        </View>
                    </View>

                    {/* Photos section */}
                    <Text style={{ paddingHorizontal: 16, paddingTop: 16, fontSize: 15, fontWeight: "700", color: "#111" }}>Ảnh</Text>
                    <View style={{
                        margin: 16,
                        borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
                        borderStyle: "dashed",
                        alignItems: "center", paddingVertical: 40,
                    }}>
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: "#eef0ff",
                            alignItems: "center", justifyContent: "center", marginBottom: 12,
                        }}>
                            <Ionicons name="images" size={32} color="#aab" />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 4 }}>
                            Chưa có ảnh nào
                        </Text>
                        <Text style={{
                            fontSize: 13, color: "#999", marginBottom: 20,
                            textAlign: "center", paddingHorizontal: 24,
                        }}>
                            Thêm ảnh tại đây để xem trước cùng với chủ đề trang trí.
                        </Text>
                        <Pressable
                            onPress={handlePickImages}
                            style={{
                                backgroundColor: "#0068FF",
                                borderRadius: 24,
                                paddingHorizontal: 32, paddingVertical: 12,
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14, letterSpacing: 0.5 }}>
                                THÊM ẢNH
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}