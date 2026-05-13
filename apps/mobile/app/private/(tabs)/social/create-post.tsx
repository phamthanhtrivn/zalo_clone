import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { userService } from "../../../../services/user.service"
import { Visibility, BottomSheet, Friend, Location } from "../../../../types/social.type";
import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PostHeader from "../../../../components/social/PostHeader";
import PostBody from "../../../../components/social/Postbody";
import QuickActions from "../../../../components/social/Quickactions";
import BottomToolbar from "../../../../components/social/Bottomtoolbar";
import MediaSheet from "../../../../components/social/MediaSheet";
import FriendsSheet from "../../../../components/social/Friendssheet";
import AlbumSheet from "../../../../components/social/Albumsheet";
import LocationSheet from "../../../../components/social/Locationsheet";
import FontSheet from "../../../../components/social/FontSheet";
import MusicSheet from "../../../../components/social/MusicSheet";
import { createPost } from "@/services/social.service";

export default function CreatePostScreen() {
    const router = useRouter();

    // ── Core state
    const [text, setText] = useState("");
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
    const [visibility, setVisibility] = useState<Visibility>("FRIENDS");
    const [bottomSheet, setBottomSheet] = useState<BottomSheet>("none");
    const [activeIcon, setActiveIcon] = useState<string | null>(null);
    const [video, setVideo] = useState<string | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);
    // State quản lý bạn bè
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);

    // ĐÃ XÓA State của Music ở đây vì MusicSheet tự quản lý

    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // State cho font và music (kết quả sau khi chọn)
    const [selectedFontStyle, setSelectedFontStyle] = useState<any>(null);
    const [selectedFontColor, setSelectedFontColor] = useState<any>(null);
    const [selectedMusic, setSelectedMusic] = useState<any>(null);

    const canPost = text.trim().length > 0 || selectedImages.length > 0;
    const selectedFriends = friends.filter(f => f.selected);

    // Fetch danh sách bạn bè từ Backend
    useEffect(() => {
        const fetchFriendsList = async () => {
            setIsLoadingFriends(true);
            try {
                const response = await userService.getListFriends();
                const users = response?.users ?? response?.data?.users ?? [];
                const mappedData = users
                    .flatMap((group: any) => group.friends)
                    .map((f: any) => ({
                        id: f.friendId,
                        name: f.name || "Người dùng",
                        avatar: f.avatarUrl || "https://i.pravatar.cc/150",
                        selected: false,
                    }));
                setFriends(mappedData);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách bạn bè:", error);
            } finally {
                setIsLoadingFriends(false);
            }
        };
        fetchFriendsList();
    }, []);

    // ĐÃ XÓA hàm useEffect fetchHotMusic ở đây để nhường việc đó cho MusicSheet

    const openSheet = (sheet: BottomSheet, icon?: string) => {
        setActiveIcon(icon ?? null);
        setBottomSheet(sheet);
    };
    const closeSheet = () => {
        setBottomSheet("none");
        setActiveIcon(null);
    };

    // Toggle ảnh từ MediaSheet
    const handleToggleMedia = useCallback((id: string, uri: string) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                setSelectedImages(imgs => imgs.filter(u => u !== uri));
            } else {
                next.add(id);
                setSelectedImages(imgs => [...imgs, uri]);
            }
            return next;
        });
    }, []);

    // Xoá ảnh khỏi preview
    const handleRemoveImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    // Chọn video từ thư viện
    const handlePickVideo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Cần quyền thư viện"); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 1,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setVideo(uri);
            setSelectedImages(prev => [...prev, uri]);
        }
    };

    // Lấy vị trí GPS hiện tại
    const handleGetCurrentLocation = async () => {
        setLoadingLocation(true);
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Không có quyền vị trí");
            setLoadingLocation(false);
            return;
        }
        const loc = await ExpoLocation.getCurrentPositionAsync({});
        const addr = await ExpoLocation.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });
        const place = addr[0];
        setSelectedLocation({
            id: "me",
            name: place.name || "Vị trí hiện tại",
            address: `${place.street ?? ""} ${place.city ?? ""}`.trim(),
            distance: "0 m",
        });
        setLoadingLocation(false);
    };

    const toggleFriend = (id: string) => {
        setFriends(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
    };

    const handleRemoveMusic = () => {
        setSelectedMusic(null);
    };

    const handlePost = async () => {
        try {
            const formData = new FormData();

            // TEXT
            if (text.trim()) {
                formData.append("text", text);
            }

            formData.append("visibility", visibility);

            // LOCATION
            if (selectedLocation) {
                formData.append("location", JSON.stringify(selectedLocation));
            }

            // MUSIC
            if (selectedMusic) {
                formData.append("music", JSON.stringify(selectedMusic));
            }

            // FRIENDS
            if (selectedFriends.length > 0) {
                formData.append(
                    "taggedFriends",
                    JSON.stringify(selectedFriends.map(f => f.id))
                );
            }

            // FONT
            if (selectedFontStyle) {
                formData.append("fontStyle", selectedFontStyle);
            }

            if (selectedFontColor?.color) {
                formData.append("fontColor", selectedFontColor.color);
            }

            // FILES
            selectedImages.forEach((uri, index) => {
                const fileName = uri.split("/").pop() || `file-${index}.jpg`;

                formData.append("files", {
                    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
                    name: fileName,
                    type: uri.endsWith(".mp4") ? "video/mp4" : "image/jpeg",
                } as any);
            });

            await createPost(formData);

            Alert.alert("✅ Thành công", "Đăng bài OK");
            router.back();

        } catch (err: any) {
            console.log("❌ ERROR:", err?.response?.data);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <PostHeader
                    visibility={visibility}
                    canPost={canPost}
                    onBack={() => router.back()}
                    onPost={handlePost}
                    onFont={() => openSheet("font")}
                    onChangeVisibility={() => setShowVisibilitySheet(true)}
                />

                <ScrollView
                    style={{ flex: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <PostBody
                        text={text}
                        onChangeText={setText}
                        selectedImages={selectedImages}
                        onRemoveImage={handleRemoveImage}
                        selectedFriends={selectedFriends}
                        selectedLocation={selectedLocation}
                        onRemoveLocation={() => setSelectedLocation(null)}
                        fontStyle={selectedFontStyle}
                        fontColor={selectedFontColor?.color}
                        selectedMusic={selectedMusic}
                        onRemoveMusic={handleRemoveMusic}
                    />
                    <QuickActions
                        onMusic={() => openSheet("music")}
                        onAlbum={() => openSheet("album")}
                        onFriends={() => openSheet("friends", "people")}
                        onFont={() => openSheet("font")}
                    />
                </ScrollView>

                <BottomToolbar
                    activeIcon={activeIcon}
                    onMedia={() => openSheet("media", "image")}
                    onVideo={handlePickVideo}
                    onLocation={handleGetCurrentLocation}
                    loadingLocation={loadingLocation}
                />

                <FontSheet
                    visible={bottomSheet === "font"}
                    onClose={closeSheet}
                    onSelect={(style, color) => {
                        setSelectedFontStyle(style);
                        setSelectedFontColor(color);
                    }}
                />

                {/* MusicSheet gọi gọn gàng, nó sẽ tự lo việc fetch nhạc */}
                <MusicSheet
                    visible={bottomSheet === "music"}
                    onClose={closeSheet}
                    onSelect={(music) => {
                        setSelectedMusic(music);
                    }}
                />

                <MediaSheet
                    visible={bottomSheet === "media"}
                    checkedIds={checkedIds}
                    onToggle={handleToggleMedia}
                    onConfirm={closeSheet}
                    onClose={closeSheet}
                />
                <FriendsSheet
                    visible={bottomSheet === "friends"}
                    friends={friends}
                    loading={isLoadingFriends}
                    onToggle={toggleFriend}
                    onClose={closeSheet}
                    onConfirm={closeSheet}
                />
                <AlbumSheet
                    visible={bottomSheet === "album"}
                    onClose={closeSheet}
                    onSave={(name, desc) => console.log("Album:", name, desc)}
                />
                <LocationSheet
                    visible={bottomSheet === "location"}
                    onSelect={setSelectedLocation}
                    onClose={closeSheet}
                />
                <Modal visible={showVisibilitySheet} transparent animationType="slide">
                    <View style={{ flex: 1, justifyContent: "flex-end" }}>
                        {/* Overlay */}
                        <Pressable
                            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                            onPress={() => setShowVisibilitySheet(false)}
                        />

                        {/* Sheet */}
                        <View style={{
                            backgroundColor: "#fff",
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 16
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
                                Chọn đối tượng
                            </Text>

                            {[
                                {
                                    key: "PUBLIC",
                                    label: "Công khai",
                                    desc: "Ai cũng xem được",
                                    icon: "earth"
                                },
                                {
                                    key: "FRIENDS",
                                    label: "Bạn bè",
                                    desc: "Chỉ bạn bè xem",
                                    icon: "people"
                                },
                                {
                                    key: "PRIVATE",
                                    label: "Chỉ mình tôi",
                                    desc: "Chỉ bạn thấy",
                                    icon: "lock-closed"
                                },
                            ].map(opt => {
                                const isActive = visibility === opt.key;

                                return (
                                    <Pressable
                                        key={opt.key}
                                        onPress={() => {
                                            setVisibility(opt.key as Visibility);
                                            setShowVisibilitySheet(false);
                                        }}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingVertical: 12
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                            <Ionicons name={opt.icon as any} size={20} color="#333" />
                                            <View>
                                                <Text style={{ fontSize: 15 }}>{opt.label}</Text>
                                                <Text style={{ fontSize: 12, color: "#999" }}>
                                                    {opt.desc}
                                                </Text>
                                            </View>
                                        </View>

                                        {isActive && (
                                            <Ionicons name="checkmark" size={20} color="#0068FF" />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}