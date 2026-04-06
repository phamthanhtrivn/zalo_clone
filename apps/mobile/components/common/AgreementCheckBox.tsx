import { COLORS } from "@/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, View } from "react-native";

type AgreementCheckBoxType = {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
};

export default function AgreementCheckBox({
  checked,
  children,
  onChange,
}: AgreementCheckBoxType) {
  return (
    <View className="flex flex-row items-center gap-2">
      {/* Checkbox */}
      <Pressable onPress={() => onChange(!checked)}>
        <MaterialIcons
          name={checked ? "check-box" : "check-box-outline-blank"}
          size={22}
          color={`${COLORS.primary}`}
        />
      </Pressable>

      {/* Text */}
      <View>{children}</View>
    </View>
  );
}
