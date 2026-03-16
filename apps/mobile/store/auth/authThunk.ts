import { UserLogin } from "@/constants/types";
import { api } from "@/services/api";
import { authService } from "@/services/auth.service";
import { createAsyncThunk } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (userLogin: UserLogin, thunkAPI) => {
    try {
      const data = await authService.signIn(userLogin);
      await SecureStore.setItemAsync("refresh_token", data.refreshToken);
      await SecureStore.setItemAsync("access_token", data.accessToken);

      api.defaults.headers.common["Authorization"] =
        `Bearer ${data.accessToken}`;

      return data.user;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Login failed",
      );
    }
  },
);

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, thunkAPI) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) return null;

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const user = await authService.getMe();

      return user;
    } catch {
      return null;
    }
  },
);

export const logOut = createAsyncThunk("auth/logOut", async (_, thunkApi) => {
  try {
    const refreshToken = await SecureStore.getItemAsync("refresh_token");

    if (!refreshToken) {
      throw new Error();
    }

    const message = await authService.signOut(refreshToken);

    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");

    return message;
  } catch (err: any) {
    return thunkApi.rejectWithValue(
      err.response.data.message || "Lỗi hệ thống !",
    );
  }
});
