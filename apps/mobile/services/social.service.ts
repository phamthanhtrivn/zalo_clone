import { api } from "./api";

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