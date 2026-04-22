import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { scale } from "@/utils/responsive";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch } from "@/store/store";
import { scanQrLogin } from "@/store/auth/authThunk";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  // 1. Kiểm tra quyền
  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Text className="text-white text-center mb-6 text-base font-medium">
          Zalo cần quyền truy cập Camera để quét mã QR
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-[#007AFF] px-8 py-3 rounded-full active:opacity-70"
        >
          <Text className="text-white font-bold text-base">
            Cấp quyền Camera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const rs = await dispatch(scanQrLogin(data)).unwrap();
      router.push({
        pathname: "/private/confirm-qr-login",
        params: { qrToken: data, device: JSON.stringify(rs.device) },
      });
    } catch (error: any) {
      ToastAndroid.show(
        error.response?.data?.message || "Mã QR không hợp lệ",
        ToastAndroid.LONG,
      );
      setScanned(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 p-8">
      {/* 2. Camera phải chiếm toàn bộ View cha */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <View className="flex-1 justify-between items-center">
        <View className="items-center justify-center w-full">
          <TouchableOpacity className="start-0 absolute w-11 h-11 rounded-full bg-black/40 justify-center items-center">
            <EvilIcons name="close" size={scale(24)} color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="flex flex-row items-center gap-4 bg-black/40 px-5 py-2.5 rounded-full">
            <FontAwesome5 name="user" size={scale(15)} color="white" />
            <Text className="text-white text-sm">Mã QR của tôi</Text>
          </TouchableOpacity>
        </View>
        <View className="w-[280px] h-[280px] relative">
          {/* Góc trên trái */}
          <View className="absolute top-0 left-0 w-14 h-14 border-white/50 border-t-[8px] border-l-[8px] rounded-tl-2xl" />
          {/* Góc trên phải */}
          <View className="absolute top-0 right-0 w-14 h-14 border-white/50 border-t-[8px] border-r-[8px] rounded-tr-2xl" />
          {/* Góc dưới trái */}
          <View className="absolute bottom-0 left-0 w-14 h-14 border-white/50 border-b-[8px] border-l-[8px] rounded-bl-2xl" />
          {/* Góc dưới phải */}
          <View className="absolute bottom-0 right-0 w-14 h-14 border-white/50 border-b-[8px] border-r-[8px] rounded-br-2xl" />
        </View>
        <View></View>
      </View>
      {/* Vùng tối bên phải */}
    </SafeAreaView>
  );
}
