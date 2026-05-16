import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDiaryPosts,
  reactPostThunk,
  commentPostThunk,
  fetchCommentsThunk,
  deleteCommentThunk,
} from "./diaryThunk";

interface CommentUser {
  id: string;
  name: string;
  avatar: string;
}

export interface CommentItem {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  user: CommentUser;
}

interface Post {
  id: string;
  _id?: string;
  userId: string;
  visibility?: string;
  name: string;
  avatar: string;
  text: string;
  images: string[];
  media?: { type: "IMAGE" | "VIDEO"; url: string }[];
  videoUrl?: string;
  likes: number;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
  comments: number;
  createdAt: string;
  authorId?: string;
}

interface DiaryState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  /** comments theo postId */
  commentsByPost: Record<string, CommentItem[]>;
  commentLoading: Record<string, boolean>;
}

const initialState: DiaryState = {
  posts: [],
  loading: false,
  error: null,
  commentsByPost: {},
  commentLoading: {},
};

const diarySlice = createSlice({
  name: "diary",
  initialState,
  reducers: {
    removePostFromFeed: (state, action) => {
      const postId = String(action.payload);
      state.posts = state.posts.filter(
        (post) => String(post.id || post._id) !== postId,
      );
      delete state.commentsByPost[postId];
      delete state.commentLoading[postId];
    },
    removeAuthorPostsFromFeed: (state, action) => {
      const authorId = String(action.payload);
      const removedIds = state.posts
        .filter((post) => String(post.authorId || post.userId) === authorId)
        .map((post) => String(post.id || post._id));

      state.posts = state.posts.filter(
        (post) => String(post.authorId || post.userId) !== authorId,
      );

      for (const postId of removedIds) {
        delete state.commentsByPost[postId];
        delete state.commentLoading[postId];
      }
    },
    updatePostVisibilityInFeed: (state, action) => {
      const { postId, visibility } = action.payload;
      const post = state.posts.find(
        (item) => String(item.id || item._id) === String(postId),
      );
      if (post) {
        post.visibility = visibility;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH POSTS
      .addCase(fetchDiaryPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDiaryPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload ?? [];
      })
      .addCase(fetchDiaryPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // REACT
      .addCase(reactPostThunk.fulfilled, (state, action) => {
        const post = state.posts.find(
          (p) =>
            p.id === action.payload.postId || p._id === action.payload.postId,
        );
        if (post) {
          post.likes = action.payload.likes;
          post.reactionCounts = action.payload.reactionCounts;
          post.myReaction = action.payload.myReaction;
        }
      })

      // COMMENT (gửi mới)
      .addCase(commentPostThunk.fulfilled, (state, action) => {
        const { postId, comment } = action.payload;
        const post = state.posts.find((p) => p.id === postId);
        if (post) post.comments += 1;

        if (comment && comment.id) {
          if (!state.commentsByPost[postId]) {
            state.commentsByPost[postId] = [];
          }
          state.commentsByPost[postId].push(comment as CommentItem);
        }
      })

      // FETCH COMMENTS
      .addCase(fetchCommentsThunk.pending, (state, action) => {
        state.commentLoading[action.meta.arg] = true;
      })
      .addCase(fetchCommentsThunk.fulfilled, (state, action) => {
        const { postId, comments } = action.payload;
        state.commentsByPost[postId] = comments ?? [];
        state.commentLoading[postId] = false;
      })
      .addCase(fetchCommentsThunk.rejected, (state, action) => {
        state.commentLoading[action.meta.arg] = false;
      })

      // DELETE COMMENT
      .addCase(deleteCommentThunk.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        if (state.commentsByPost[postId]) {
          state.commentsByPost[postId] = state.commentsByPost[postId].filter(
            (c) => c.id.toString() !== commentId,
          );
        }
        const post = state.posts.find((p) => p.id === postId);
        if (post && post.comments > 0) post.comments -= 1;
      });
  },
});

export const {
  removePostFromFeed,
  removeAuthorPostsFromFeed,
  updatePostVisibilityInFeed,
} = diarySlice.actions;
export default diarySlice.reducer;
