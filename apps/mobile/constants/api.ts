import { Platform } from "react-native";

// 10.0.2.2 là địa chỉ localhost của máy tính khi truy cập từ Android Emulator.
// Nếu dùng thiết bị thật, hãy thay bằng IP máy tính của bạn (VD: 192.168.1.x)
export const API_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";