export type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";
export type BottomSheet = "none" | "media" | "friends" | "album" | "location";

export interface Friend {
    id: string;
    name: string;
    avatar: string;
    selected: boolean;
}

export interface Location {
    id: string;
    name: string;
    address: string;
    distance: string;
}
export interface Music {
    id: string;
    title: string;
    artist: string;
    duration?: string;
    thumbnail?: string;
    previewUrl?: string;
}