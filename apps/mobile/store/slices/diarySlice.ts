import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    fetchDiaryPosts,
    reactPostThunk,
    commentPostThunk,
} from "./diaryThunk";

interface Post {
    id: string;
    userId: string;
    name: string;
    avatar: string;
    text: string;
    images: string[];
    likes: number;
    comments: number;
    createdAt: string;
}

interface DiaryState {
    posts: Post[];
    loading: boolean;
    error: string | null;
}

const initialState: DiaryState = {
    posts: [],
    loading: false,
    error: null,
};

const diarySlice = createSlice({
    name: "diary",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // FETCH
            .addCase(fetchDiaryPosts.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchDiaryPosts.fulfilled, (state, action) => {
                state.loading = false;
                state.posts = action.payload;
            })
            .addCase(fetchDiaryPosts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // LIKE
            .addCase(reactPostThunk.fulfilled, (state, action) => {
                const post = state.posts.find(
                    (p) => p.id === action.payload.postId
                );
                if (post) {
                    post.likes = action.payload.likes;
                }
            })

            // COMMENT
            .addCase(commentPostThunk.fulfilled, (state, action) => {
                const post = state.posts.find(
                    (p) => p.id === action.payload.postId
                );
                if (post) {
                    post.comments += 1;
                }
            });
    },
});

export default diarySlice.reducer;