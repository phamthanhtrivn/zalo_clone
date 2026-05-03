import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    Pressable,
    FlatList,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Music {
    id: string;
    title: string;
    artist: string;
    duration: string;
    url?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (music: Music) => void;
}

const MOCK_MUSIC: Music[] = [
    { id: "1", title: "Shape of You", artist: "Ed Sheeran", duration: "3:53" },
    { id: "2", title: "Blinding Lights", artist: "The Weeknd", duration: "3:20" },
    { id: "3", title: "Dance Monkey", artist: "Tones and I", duration: "3:29" },
    { id: "4", title: "Someone Like You", artist: "Adele", duration: "4:45" },
    { id: "5", title: "Bohemian Rhapsody", artist: "Queen", duration: "5:55" },
    { id: "6", title: "Hotel California", artist: "Eagles", duration: "6:30" },
    { id: "7", title: "Imagine", artist: "John Lennon", duration: "3:03" },
    { id: "8", title: "Yesterday", artist: "The Beatles", duration: "2:05" },
    { id: "9", title: "Rolling in the Deep", artist: "Adele", duration: "3:48" },
    { id: "10", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: "4:30" },
];

export default function MusicSheet({ visible, onClose, onSelect }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.container}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </Pressable>
                        <Text style={styles.title}>Chọn nhạc</Text>
                        <Pressable
                            onPress={() => {
                                const music = MOCK_MUSIC.find(m => m.id === selectedId);
                                if (music) {
                                    onSelect(music);
                                    onClose();
                                }
                            }}
                        >
                            <Text style={[styles.doneBtn, !selectedId && styles.disabled]}>
                                Xong
                            </Text>
                        </Pressable>
                    </View>

                    {/* Search bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color="#999" />
                        <Text style={styles.searchPlaceholder}>Tìm kiếm bài hát...</Text>
                    </View>

                    {/* Music list */}
                    <FlatList
                        data={MOCK_MUSIC}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isSelected = selectedId === item.id;
                            return (
                                <Pressable
                                    style={[styles.musicItem, isSelected && styles.selectedItem]}
                                    onPress={() => setSelectedId(item.id)}
                                >
                                    <View style={[styles.musicIcon, isSelected && styles.selectedMusicIcon]}>
                                        {isSelected ? (
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                        ) : (
                                            <Ionicons name="musical-note" size={20} color="#666" />
                                        )}
                                    </View>
                                    <View style={styles.musicInfo}>
                                        <Text style={[styles.musicTitle, isSelected && styles.selectedText]}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.musicArtist}>{item.artist}</Text>
                                    </View>
                                    <Text style={styles.musicDuration}>{item.duration}</Text>
                                </Pressable>
                            );
                        }}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        paddingBottom: 30,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    title: {
        fontSize: 17,
        fontWeight: "600",
        color: "#333",
    },
    doneBtn: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0068FF",
    },
    disabled: {
        color: "#ccc",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        gap: 8,
    },
    searchPlaceholder: {
        fontSize: 14,
        color: "#999",
    },
    listContent: {
        paddingHorizontal: 16,
    },
    musicItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 6,
    },
    selectedItem: {
        backgroundColor: "#e3f0ff",
    },
    musicIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    selectedMusicIcon: {
        backgroundColor: "#0068FF",
    },
    musicInfo: {
        flex: 1,
    },
    musicTitle: {
        fontSize: 15,
        fontWeight: "500",
        color: "#333",
    },
    selectedText: {
        color: "#0068FF",
        fontWeight: "600",
    },
    musicArtist: {
        fontSize: 13,
        color: "#999",
        marginTop: 2,
    },
    musicDuration: {
        fontSize: 13,
        color: "#999",
    },
});