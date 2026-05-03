import React from "react";
import {
    Modal, View, Text, Pressable, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Location } from "../../types/social.type";
import { MOCK_LOCATIONS } from "./index";

interface Props {
    visible: boolean;
    onSelect: (loc: Location) => void;
    onClose: () => void;
}

export default function LocationSheet({ visible, onSelect, onClose }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                {/* Backdrop */}
                <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
                    onPress={onClose}
                />

                <View style={{
                    backgroundColor: "#fff",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    maxHeight: "70%",
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                }}>
                    {/* Handle */}
                    <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc" }} />
                    </View>

                    <Text style={{
                        textAlign: "center", fontSize: 16, fontWeight: "700",
                        paddingVertical: 12,
                        borderBottomWidth: 0.5, borderBottomColor: "#eee",
                    }}>
                        Địa điểm
                    </Text>

                    <Text style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, fontSize: 13, color: "#888" }}>
                        Chọn địa điểm
                    </Text>

                    <ScrollView>
                        {MOCK_LOCATIONS.map(loc => (
                            <Pressable
                                key={loc.id}
                                onPress={() => { onSelect(loc); onClose(); }}
                                style={{
                                    flexDirection: "row", alignItems: "flex-start",
                                    paddingHorizontal: 16, paddingVertical: 14,
                                    borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0",
                                    gap: 12,
                                }}
                            >
                                <View style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: "#f0f0f0",
                                    alignItems: "center", justifyContent: "center",
                                }}>
                                    <Ionicons name="location" size={18} color="#555" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111", flex: 1 }} numberOfLines={1}>
                                            {loc.name}
                                        </Text>
                                        {loc.id === "1" && (
                                            <View style={{
                                                backgroundColor: "#e8f0fe", borderRadius: 4,
                                                paddingHorizontal: 6, paddingVertical: 2,
                                            }}>
                                                <Text style={{ fontSize: 11, color: "#0068FF", fontWeight: "600" }}>Vị trí</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }} numberOfLines={1}>
                                        {loc.distance} • {loc.address}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}