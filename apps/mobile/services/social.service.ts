import { api } from "./api";
import axios from "axios";
import { config } from "@/constants/config";

export const getFeed = async () => {
  const res = await api.get("/posts/feed");
  return res;
};

export const getVideoFeed = async (
  category?: string,
  feedType?: string,
  authorId?: string,
) => {
  const res = await api.get("/posts/video-feed", {
    params: {
      ...(category ? { category } : {}),
      ...(feedType ? { feedType } : {}),
      ...(authorId ? { authorId } : {}),
    },
  });
  return res;
};

export const getVideoProfile = async (userId?: string) => {
  const res = await api.get("/posts/video-profile", {
    params: userId ? { userId } : {},
  });
  return res;
};

export const followVideoCreator = async (userId: string) => {
  const res = await api.post(`/posts/video-profile/follow/${userId}`);
  return res;
};

export const unfollowVideoCreator = async (userId: string) => {
  const res = await api.delete(`/posts/video-profile/follow/${userId}`);
  return res;
};

export const getPostDetail = async (postId: string) => {
  const res = await api.get(`/posts/detail/${postId}`);
  return res;
};

export const getSocialNotifications = async () => {
  const res = await api.get("/posts/notifications");
  return res;
};

export const markSocialNotificationRead = async (notificationId: string) => {
  const res = await api.post(`/posts/notifications/${notificationId}/read`);
  return res;
};

export const reactPost = async (postId: string, type = "LIKE") => {
  const res = await api.post(`/posts/${postId}/react`, { type });
  return res;
};

export const sharePost = async (postId: string) => {
  const res = await api.post(`/posts/${postId}/share`);
  return res;
};

export const deletePost = async (postId: string) => {
  const res = await api.delete(`/posts/${postId}`);
  return res;
};

export const updatePostVisibility = async (
  postId: string,
  visibility: string,
) => {
  const res = await api.post(`/posts/${postId}/visibility`, { visibility });
  return res;
};

export const hideAuthorPosts = async (postId: string) => {
  const res = await api.post(`/posts/${postId}/hide-author`);
  return res;
};

export const blockDiaryViewer = async (postId: string) => {
  const res = await api.post(`/posts/${postId}/block-viewer`);
  return res;
};

export const reportPost = async (postId: string, reason?: string) => {
  const res = await api.post(`/posts/${postId}/report`, {
    reason: reason || "",
  });
  return res;
};

export const commentPost = async (
  postId: string,
  content: string,
  parentId?: string,
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
    const res = await axios.get(`${config.apiUrl}/api/posts/search`, {
      params,
    });
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

export const createVideoPost = async (formData: FormData) => {
  const res = await api.post("/posts/video", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res;
};

export const createStory = async (formData: FormData) => {
  const res = await api.post("/posts/stories", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res;
};

export const getStories = async () => {
  const res = await api.get("/posts/stories");
  return res;
};

export const deleteStory = async (storyId: string) => {
  const res = await api.delete(`/posts/stories/${storyId}`);
  return res;
};

export const markStoryViewed = async (storyId: string) => {
  const res = await api.post(`/posts/stories/${storyId}/view`);
  return res;
};

export const getStoryViewers = async (storyId: string) => {
  const res = await api.get(`/posts/stories/${storyId}/viewers`);
  return res;
};

export const reactStory = async (storyId: string, type: string) => {
  const res = await api.post(`/posts/stories/${storyId}/react`, { type });
  return res;
};

export const replyStory = async (storyId: string, content: string) => {
  const res = await api.post(`/posts/stories/${storyId}/reply`, { content });
  return res;
};

export const getStoryMusicSuggestions = async (q: string = "") => {
  const res = await api.get("/posts/stories/music", {
    params: q.trim() ? { q: q.trim() } : {},
  });
  return res;
};
