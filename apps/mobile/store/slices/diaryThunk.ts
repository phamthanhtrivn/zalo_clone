import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFeed, reactPost, commentPost } from "@/services/social.service";

// GET FEED
export const fetchDiaryPosts = createAsyncThunk(
    "diary/fetchPosts",
    async (_, { rejectWithValue }) => {
        try {
            const res = await getFeed();

            return res.data; // 👈 CHỈ LẤY ARRAY POSTS

        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// LIKE
export const reactPostThunk = createAsyncThunk(
    "diary/reactPost",
    async ({ postId }: { postId: string }, { rejectWithValue }) => {
        try {
            const res = await reactPost(postId);
            return { postId, likes: res.likes };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// COMMENT
export const commentPostThunk = createAsyncThunk(
    "diary/commentPost",
    async (
        { postId, content }: { postId: string; content: string },
        { rejectWithValue }
    ) => {
        try {
            await commentPost(postId, content);
            return { postId };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);