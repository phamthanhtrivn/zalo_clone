import React from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    activeIcon: string | null;
    onMedia: () => void;
    onVideo: () => void;
    onLocation: () => void;
    loadingLocation?: boolean;
}

export default function BottomToolbar({
    activeIcon,
    onMedia,
    onVideo,
    onLocation,
    loadingLocation = false,
}: Props) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
        ]}>
            <ToolbarBtn name="happy-outline" active={activeIcon === "emoji"} onPress={() => { }} />
            <ToolbarBtn name="image-outline" active={activeIcon === "image"} onPress={onMedia} />
            <ToolbarBtn name="play-circle-outline" active={activeIcon === "video"} onPress={onVideo} />
            <ToolbarBtn name="link-outline" active={activeIcon === "link"} onPress={() => { }} />

            {/* Location — hiển thị spinner khi đang lấy GPS */}
            <Pressable
                onPress={onLocation}
                style={[styles.btn, activeIcon === "location" && styles.btnActive]}
            >
                {loadingLocation
                    ? <ActivityIndicator size="small" color="#0068FF" />
                    : <Ionicons
                        name="location-outline"
                        size={26}
                        color={activeIcon === "location" ? "#0068FF" : "#444"}
                    />
                }
            </Pressable>
        </View>
    );
}

function ToolbarBtn({
    name, active, onPress,
}: {
    name: string; active: boolean; onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.btn, active && styles.btnActive]}
        >
            <Ionicons
                name={name as any}
                size={26}
                color={active ? "#0068FF" : "#444"}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 0.5,
        borderTopColor: "#ddd",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    btn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        minHeight: 44,
    },
    btnActive: { backgroundColor: "#e8f0fe" },
});