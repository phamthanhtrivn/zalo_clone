import { View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className, ...props }: ContainerProps) => {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className={`flex-1 ${className}`} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
};

export default Container;
