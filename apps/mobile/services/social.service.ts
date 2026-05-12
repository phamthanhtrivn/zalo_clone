import { api } from "./api";
import axios from "axios";
import { config } from "@/constants/config";

export const getFeed = async () => {
    const res = await api.get("/posts/feed");
    return res;
};

export const reactPost = async (postId: string, type = "LIKE") => {
    const res = await api.post(`/posts/${postId}/react`, { type });
    return res;
};

export const commentPost = async (
    postId: string,
    content: string,
    parentId?: string
) => {
    const res = await api.post(`/posts/${postId}/comment`, {
        content,
        ...(parentId ? { parentId } : {}),
    });
    return res;
};

export const getComments = async (postId: string) => {
    const res = await api.get(`/posts/${postId}/comments`);
    return res;
};

export const deleteComment = async (commentId: string) => {
    const res = await api.delete(`/posts/comments/${commentId}`);
    return res;
};

export const musicService = {
    searchMusic: async (keyword: string = "") => {
        const params = keyword.trim() ? { q: keyword.trim() } : {};
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
