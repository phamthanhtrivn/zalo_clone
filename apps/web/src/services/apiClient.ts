import axios from "axios";

function normalizeApiBaseUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}

const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
import { store } from "@/store";
import { clearAuth, updateToken } from "@/store/auth/authSlice";
import { getDeviceId } from "@/utils/device.util";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Dùng riêng cho refresh token
const refreshApi = axios.create({
  baseURL: `${API_URL}`,
  timeout: 10000,
  withCredentials: true,
});

refreshApi.interceptors.request.use((config) => {
  config.headers["x-device-id"] = getDeviceId();
  return config;
});

apiClient.interceptors.request.use((config) => {
  //gắn device id vào headers
  config.headers["x-device-id"] = getDeviceId();
  const state = store.getState();
  const token = state.auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // những api không cần check
    if (
      originalRequest?.url?.includes("/api/auth/sign-in") ||
      originalRequest?.url?.includes("/api/auth/sign-up") ||
      originalRequest?.url?.includes("/api/api/auth/qr-login/exchange")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await refreshApi.post(
          "/api/auth/token/refresh",
          {},
          { withCredentials: true },
        );

        const newAccessToken = res.data.data.accessToken;

        store.dispatch(updateToken(newAccessToken));

        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (err) {
        store.dispatch(clearAuth()); // Refresh lỗi thì xóa sạch data
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);
