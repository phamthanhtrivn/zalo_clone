import type {
  ChangePassword,
  CompleteSignUp,
  OtpVerify,
  ResetPassword,
  UserLogin,
} from "@/constants/types";
import { apiClient } from "./apiClient";

export const authService = {
  signIn: async (payload: UserLogin) => {
    const res = await apiClient.post("/auth/sign-in", payload);
    return res.data.data;
  },
  getMe: async () => {
    const res = await apiClient.get("/auth/profile");
    return res.data.data;
  },
  signOut: async () => {
    const res = await apiClient.post("/auth/sign-out");
    return res.data.data;
  },
  signUp: async (phone: string) => {
    const res = await apiClient.post("/auth/sign-up", { phone });
    return res.data.data;
  },
  completeRegister: async (data: CompleteSignUp, tempToken: string) => {
    const res = await apiClient.post("/auth/complete-sign-up", data, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    return res.data.data;
  },
  verifyOtp: async (payload: OtpVerify) => {
    const res = await apiClient.post("/auth/otp/verify", payload);
    return res.data.data;
  },
  forgotPassWord: async (phone: string) => {
    const res = await apiClient.post("/auth/forgot-password", { phone });
    return res.data.data;
  },
  resetPassword: async (payload: ResetPassword, tempToken: string) => {
    const res = await apiClient.post("/auth/reset-password", payload, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    return res.data.data;
  },
  changePassword: async (payload: ChangePassword) => {
    const res = await apiClient.post("/auth/change-password", payload);
    return res.data.data;
  },
};
