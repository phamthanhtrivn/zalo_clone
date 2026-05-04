import { api } from "./api";
import axios from "axios";
import { config } from "@/constants/config";
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
    // social.service.ts
    searchMusic: async (keyword: string = "") => {
        const params = keyword.trim() ? { q: keyword.trim() } : {}; // không truyền q nếu rỗng
        const res = await axios.get(`${config.apiUrl}/api/posts/search`, { params });
        return res.data;
    },
};
export const createPost = async (formData: FormData) => {
    const res = await api.post("/posts", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return res;
};

