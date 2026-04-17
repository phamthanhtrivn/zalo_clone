import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
import { store } from "@/store";
import { clearAuth, updateToken } from "@/store/auth/authSlice";
import { getDeviceId } from "@/utils/device.util";

//1. api chính
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

//2. api dùng riêng cho refresh token
const refreshApi = axios.create({
  baseURL: `${API_URL}`,
  timeout: 10000,
  withCredentials: true,
});

refreshApi.interceptors.request.use((config) => {
  config.headers["x-device-id"] = getDeviceId();
  return config;
});

//3.
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

    const url = originalRequest?.url ?? "";

    if (
      url.includes("/api/auth/sign-in") ||
      url.includes("/api/auth/complete-sign-up")
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
