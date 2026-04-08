import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { moderateScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/constants/colors";

type HeaderType = {
  back?: boolean;
  gradient?: boolean;
  centerChild?: React.ReactNode;
  leftChild?: React.ReactNode;
  rightChild?: React.ReactNode;
};

export default function Header({
  back,
  gradient,
  leftChild,
  rightChild,
  centerChild,
}: HeaderType) {
  const router = useRouter();
  return (
    <LinearGradient
      className="flex flex-row items-center h-14 px-screen-edge"
      start={[0, 0]}
      end={[1, 0]}
      // Background Linear Gradient
      colors={
        gradient
          ? [COLORS.primary, COLORS.graient]
          : [COLORS.background, COLORS.background]
      }
    >
      {/* Phần bên trái của Header */}
      <View className="w-12 flex-none">
        {leftChild}
        {back && (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="arrow-back"
              size={moderateScale(24)}
              color={`${gradient ? "white" : "black"}`}
            />
          </TouchableOpacity>
        )}
      </View>
      {/* Phần giữa */}
      <View className="flex-1">{centerChild}</View>
      {/* Phần bên phải */}
      <View className="flex-none w-12 items-end">{rightChild}</View>
    </LinearGradient>
  );
}
