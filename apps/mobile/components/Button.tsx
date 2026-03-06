import { Text, TouchableOpacity, ViewStyle } from "react-native";

type ButtonProps = {
  className?: string;
  onPress?: () => void;
  children?: React.ReactNode;
};

export default function Button({ className, onPress, children }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={
        className + " w-full text-center rounded-full p-5 mx-auto items-center"
      }
    >
      {children}
    </TouchableOpacity>
  );
}
