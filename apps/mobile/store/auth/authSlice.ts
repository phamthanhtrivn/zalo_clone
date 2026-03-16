import { createSlice } from "@reduxjs/toolkit";
import { logOut, restoreSession, signIn } from "./authThunk";
import { AuthUser } from "@/constants/types";

interface AuthSliceState {
  error: string;
  loading: boolean;
  user: AuthUser | null;
}

const initialState = {
  error: "",
  loading: false,
  user: null,
} as AuthSliceState;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      state.error = "";
      state.user = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = "";
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = "";
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false;
      })
      .addCase(logOut.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(logOut.fulfilled, (state) => {
        state.loading = false;
        state.error = "";
        state.user = null;
      })
      .addCase(logOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

const { reducer } = authSlice;
export default reducer;
