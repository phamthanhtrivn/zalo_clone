import { scale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

type OptionItem = {
  className?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function OptionItem({
  className,
  onPress,
  children,
  disabled,
  icon,
}: OptionItem) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className={className + " flex-row items-center w-full "}
    >
      {children}
      {icon && (
        <TouchableOpacity className="absolute right-0">
          <Ionicons name={icon} size={scale(18)} color="gray" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
