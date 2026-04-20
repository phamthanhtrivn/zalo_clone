import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { config } from "@/constants/config";

console.log(config.apiUrl);

export const api = axios.create({
  baseURL: `${config.apiUrl}/api`,
  timeout: 10000,
});

// dùng instance riêng để refresh (tránh loop)
const refreshApi = axios.create({
  baseURL: `${config.apiUrl}/api`,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  // ✅ Token đã là string, không cần xử lý

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest.headers?.Authorization &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      // ✅ refreshToken đã là string

      try {
        const res = await refreshApi.post("/auth/token/refresh", {
          refreshToken,
        });

        const newAccessToken = res.data?.data?.accessToken;
        if (!newAccessToken) {
          return Promise.reject(error);
        }

        // Nếu là object, chuyển thành string
        if (typeof newAccessToken !== 'string') {
          console.warn('AccessToken is not a string, converting...', newAccessToken);
          newAccessToken = JSON.stringify(newAccessToken);
        }

        // Nếu là object có field token, lấy token ra
        if (newAccessToken?.token) {
          newAccessToken = newAccessToken.token;
        }

        await SecureStore.setItemAsync("access_token", newAccessToken);

        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, clear storage and redirect to login
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);