import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { moderateScale, verticalScale } from "@/utils/responsive";
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
      className="flex flex-row gap-2 items-center px-screen-edge"
      style={{ height: 50 }}
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
      <View className="flex-none flex-row items-center gap-2.5">
        {back && (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="arrow-back"
              size={moderateScale(24)}
              color={`${gradient ? "white" : "black"}`}
            />
          </TouchableOpacity>
        )}
        {leftChild}
      </View>
      {/* Phần giữa */}
      <View className="flex-1">{centerChild}</View>
      {/* Phần bên phải */}
      <View className="flex-none flex-row items-center">{rightChild}</View>
    </LinearGradient>
  );
}
