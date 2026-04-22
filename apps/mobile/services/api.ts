import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { config } from "@/constants/config";
import { getDeviceId } from "@/utils/device.util";

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
  config.headers["x-device-id"] = await getDeviceId();
  const token = await SecureStore.getItemAsync("access_token");

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

      const res = await refreshApi.post("/auth/token/refresh", {
        refreshToken,
      });

      const newAccessToken = res.data.accessToken;

      await SecureStore.setItemAsync("access_token", newAccessToken);

      originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);
