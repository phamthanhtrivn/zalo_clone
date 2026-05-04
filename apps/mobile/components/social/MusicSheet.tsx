import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    Pressable,
    FlatList,
    StyleSheet,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { musicService } from "../../services/social.service";
import { Audio } from "expo-av";
interface Music {
    id: string;
    title: string;
    artist: string;
    duration?: string;
    previewUrl?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (music: Music) => void;
}

export default function MusicSheet({ visible, onClose, onSelect }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [musicList, setMusicList] = useState<Music[]>([]);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    // debounce search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (query.trim()) {
                fetchMusic();
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [query]);

    const fetchMusic = async () => {
        try {
            setLoading(true);
            const res = await musicService.searchMusic(query);
            setMusicList(res || []);
        } catch (err) {
            console.error("Music search error:", err);
        } finally {
            setLoading(false);
        }
    };
    const playPreview = async (url?: string) => {
        if (!url) return;

        if (sound) {
            await sound.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
        setSound(newSound);
        await newSound.playAsync();
    };
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
                                const music = musicList.find(m => m.id === selectedId);
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

                    {/* Search input */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color="#999" />
                        <TextInput
                            placeholder="Tìm kiếm bài hát..."
                            value={query}
                            onChangeText={setQuery}
                            style={{ flex: 1 }}
                        />
                    </View>

                    {/* List */}
                    <FlatList
                        data={musicList}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
                                {loading ? "Đang tải..." : "Không có bài hát"}
                            </Text>
                        }
                        renderItem={({ item }) => {
                            const isSelected = selectedId === item.id;

                            return (
                                <Pressable
                                    style={[styles.musicItem, isSelected && styles.selectedItem]}
                                    onPress={() => {
                                        setSelectedId(item.id);
                                        playPreview(item.previewUrl);
                                    }}
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