import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    getFeed,
    reactPost,
    commentPost,
    getComments,
    deleteComment,
} from "@/services/social.service";

// GET FEED
export const fetchDiaryPosts = createAsyncThunk(
    "diary/fetchPosts",
    async (_, { rejectWithValue }) => {
        try {
            const res = await getFeed();
            return (res as any).data ?? res;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// REACT (LIKE / TIM / ...)
export const reactPostThunk = createAsyncThunk(
    "diary/reactPost",
    async (
        { postId, type }: { postId: string; type: string },
        { rejectWithValue }
    ) => {
        try {
            const res: any = await reactPost(postId, type);
            const payload = res?.data ?? res;
            return {
                postId,
                likes: payload?.likes ?? payload?.totalLikes ?? 0,
                reactionCounts: payload?.reactionCounts ?? {},
                myReaction: payload?.myReaction ?? null,
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// COMMENT (có thể kèm parentId để reply)
export const commentPostThunk = createAsyncThunk(
    "diary/commentPost",
    async (
        { postId, content, parentId }: { postId: string; content: string; parentId?: string },
        { rejectWithValue }
    ) => {
        try {
            const res: any = await commentPost(postId, content, parentId);
            return { postId, comment: res.data ?? res };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// FETCH COMMENTS của 1 bài đăng
export const fetchCommentsThunk = createAsyncThunk(
    "diary/fetchComments",
    async (postId: string, { rejectWithValue }) => {
        try {
            const res: any = await getComments(postId);
            return { postId, comments: res.data ?? res };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// XOÁ BÌNH LUẬN
export const deleteCommentThunk = createAsyncThunk(
    "diary/deleteComment",
    async (
        { postId, commentId }: { postId: string; commentId: string },
        { rejectWithValue }
    ) => {
        try {
            await deleteComment(commentId);
            return { postId, commentId };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);
