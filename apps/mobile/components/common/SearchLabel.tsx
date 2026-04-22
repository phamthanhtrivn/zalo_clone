import { Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function SearchLabel() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push("/private/search")}>
      <Text className="text-white/65 text-sm">Tim kiem</Text>
    </TouchableOpacity>
  );
}
