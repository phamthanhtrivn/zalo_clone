import { TouchableOpacity } from "react-native";

type ButtonProps = {
  className?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
};

export default function Button({
  className,
  onPress,
  children,
  disabled,
}: ButtonProps) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className={className + " text-center rounded-full mx-auto items-center"}
    >
      {children}
    </TouchableOpacity>
  );
}
