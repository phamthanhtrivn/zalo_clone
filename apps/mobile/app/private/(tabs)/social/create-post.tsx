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

import PostHeader from "../../../../components/social/PostHeader";
import PostBody from "../../../../components/social/Postbody";
import QuickActions from "../../../../components/social/Quickactions";
import BottomToolbar from "../../../../components/social/Bottomtoolbar";
import MediaSheet from "../../../../components/social/MediaSheet";
import FriendsSheet from "../../../../components/social/Friendssheet";
import AlbumSheet from "../../../../components/social/Albumsheet";
import LocationSheet from "../../../../components/social/Locationsheet";
import FontSheet from "../../../../components/social/FontSheet"; // ✅ Import FontSheet
import MusicSheet from "../../../../components/social/MusicSheet"; // ✅ Import MusicSheet

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
    const [friends, setFriends] = useState<Friend[]>([]);
    const [musicList, setMusicList] = useState<any[]>([]);
    const [isLoadingMusic, setIsLoadingMusic] = useState(false);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // ✅ State cho font và music
    const [selectedFontStyle, setSelectedFontStyle] = useState<any>(null);
    const [selectedFontColor, setSelectedFontColor] = useState<any>(null);
    const [selectedMusic, setSelectedMusic] = useState<any>(null);

    const canPost = text.trim().length > 0 || selectedImages.length > 0;
    const selectedFriends = friends.filter(f => f.selected);

    // ✅ Fetch danh sách bạn bè từ Backend
    useEffect(() => {
        const fetchFriendsList = async () => {
            setIsLoadingFriends(true);
            try {
                // Sử dụng getListFriends hoặc kiểm tra lại tên hàm trong service
                const response = await userService.getListFriends();

                // Truy cập trực tiếp vào .users hoặc dự phòng qua .data.users
                const users = response?.users ?? response?.data?.users ?? [];
                const mappedData = users
                    .flatMap((group: any) => group.friends)
                    .map((f: any) => ({
                        id: f.friendId,
                        name: f.name || "Người dùng",
                        avatar: f.avatarUrl || "https://i.pravatar.cc/150",
                        selected: false,
                    }));
                console.log("Mapped friends data:", mappedData);
                setFriends(mappedData);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách bạn bè:", error);
            } finally {
                setIsLoadingFriends(false);
            }
        };
        fetchFriendsList();
    }, []);

    useEffect(() => {
        const fetchMusic = async () => {
            setIsLoadingMusic(true);
            try {
                const data = await userService.getMusicList();
                setMusicList(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách nhạc:", error);
            } finally {
                setIsLoadingMusic(false);
            }
        };
        fetchMusic();
    }, []); // Chạy 1 lần khi mount

    const openSheet = (sheet: BottomSheet, icon?: string) => {
        setActiveIcon(icon ?? null);
        setBottomSheet(sheet);
    };
    const closeSheet = () => {
        setBottomSheet("none");
        setActiveIcon(null);
    };


    // Toggle ảnh từ MediaSheet (dùng asset id)
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
        const uri = selectedImages[index];
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        // Camera asset dùng id "camera_xxx" — không có reverse map nên không xoá checkedIds
        // (ảnh từ MediaLibrary: id ≠ uri, cần map nếu muốn bỏ dấu check — đơn giản hoá: chỉ xoá uri)
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
    const handlePost = () => {
        const payload = {
            text,
            images: selectedImages,
            video,
            location: selectedLocation,
            visibility,
            taggedFriends: selectedFriends.map(f => f.id),
            // ✅ Thêm font style và music vào payload
            fontStyle: selectedFontStyle,
            fontColor: selectedFontColor?.color,
            music: selectedMusic,
        };
        console.log("POST DATA:", payload);
        // TODO: dispatch createPost thunk
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
                        // ✅ Truyền thêm props mới
                        fontStyle={selectedFontStyle}
                        fontColor={selectedFontColor?.color}
                        selectedMusic={selectedMusic}
                        onRemoveMusic={handleRemoveMusic}
                    />
                    <QuickActions
                        onMusic={() => openSheet("music")} // ✅ Mở MusicSheet
                        onAlbum={() => openSheet("album")}
                        onFriends={() => openSheet("friends", "people")}
                        onFont={() => openSheet("font")} // ✅ Mở FontSheet
                    />
                </ScrollView>

                <BottomToolbar
                    activeIcon={activeIcon}
                    onMedia={() => openSheet("media", "image")}
                    onVideo={handlePickVideo}
                    onLocation={handleGetCurrentLocation}
                    loadingLocation={loadingLocation}
                />

                {/* ✅ Thêm FontSheet */}
                <FontSheet
                    visible={bottomSheet === "font"}
                    onClose={closeSheet}
                    onSelect={(style, color) => {
                        setSelectedFontStyle(style);
                        setSelectedFontColor(color);
                        console.log("Font selected:", style.name, color.name);
                    }}
                />

                {/* ✅ Thêm MusicSheet */}
                <MusicSheet
                    visible={bottomSheet === "music"}
                    musicList={musicList}
                    loading={isLoadingMusic}
                    onClose={closeSheet}
                    onSelect={(music) => {
                        setSelectedMusic(music);
                        console.log("Music selected:", music.title);
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}