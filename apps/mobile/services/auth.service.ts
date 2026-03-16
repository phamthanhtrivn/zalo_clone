import { UserLogin } from "@/constants/types";
import { api } from "./api";

export const authService = {
  signIn: async (payload: UserLogin) => {
    const res = await api.post("/auth/sign-in", payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get("/auth/profile");
    return res.data;
  },
  signOut: async (refreshToken: string) => {
    const res = await api.post("/auth/sign-out", { refreshToken });
    return res.data;
  },
};
