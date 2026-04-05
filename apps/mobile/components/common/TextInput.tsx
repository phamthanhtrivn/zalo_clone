import { scale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";

type InputType = {
  placeholder?: string;
  security?: boolean;
  editable?: boolean;
  onPressOnIcon?: () => void;
  onChangeText?: (text: string) => void;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function Input({
  placeholder,
  security,
  onChangeText,
  onPressOnIcon,
  value,
  icon,
  editable,
}: InputType) {
  return (
    <View className="flex-row items-center">
      <TextInput
        className={`flex-1 border-b border-secondary focus:border-graident text-sm pr-7 ${icon ? "pr-7" : ""}`}
        placeholder={placeholder}
        secureTextEntry={security}
        editable={editable}
        value={value}
        onChangeText={onChangeText}
      />
      {icon && (
        <TouchableOpacity className="absolute right-0" onPress={onPressOnIcon}>
          <Ionicons name={icon} size={scale(18)} color="gray" />
        </TouchableOpacity>
      )}
    </View>
  );
}
