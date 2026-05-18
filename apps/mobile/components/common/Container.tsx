import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  edges?: Array<"top" | "right" | "bottom" | "left">;
}

const Container = ({
  children,
  className,
  edges = ["top", "left", "right"],
  style,
  ...props
}: ContainerProps) => {
  const insets = useSafeAreaInsets();

  const paddingStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  return (
    <View
      className={`flex-1 bg-white ${className}`}
      style={[paddingStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
};

export default Container;
