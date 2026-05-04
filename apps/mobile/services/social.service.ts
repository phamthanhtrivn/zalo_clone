import { api } from "./api";
import axios from "axios";

export const getFeed = async () => {
    const res = await api.get("/posts/feed");
    return res; // interceptor đã return data
};

export const reactPost = async (postId: string, type = "LIKE") => {
    const res = await api.post(`/posts/${postId}/react`, { type });
    return res;
};

export const commentPost = async (postId: string, content: string) => {
    const res = await api.post(`/posts/${postId}/comment`, { content });
    return res;
};
export const musicService = {
    searchMusic: async (keyword: string) => {
        const res = await api.get("/posts/search", {
            params: { q: keyword },
        });
        return res;
    },
};
export const getMusicList = async (searchTerm: string = "vietnam") => {
    try {
        // Gọi trực tiếp iTunes API bằng axios (không dùng instance 'api' của hệ thống)
        const response = await axios.get(
            `https://itunes.apple.com/search?term=${searchTerm}&limit=20&media=music`
        );
        return response.data.results.map((item: any) => ({
            id: item.trackId.toString(),
            title: item.trackName,
            artist: item.artistName,
            thumbnail: item.artworkUrl100,
            previewUrl: item.previewUrl,
        }));
    } catch (error) {
        console.error("Lỗi khi fetch nhạc từ iTunes:", error);
        throw error;
    }
};
