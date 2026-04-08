import { Text, View } from "react-native";

type TipsType = {
  text: string;
};

export default function Tips({ text }: TipsType) {
  return (
    <View className="bg-secondary px-screen-edge py-2">
      <Text>{text}</Text>
    </View>
  );
}
