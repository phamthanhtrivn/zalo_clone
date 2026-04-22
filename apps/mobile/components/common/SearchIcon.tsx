import { TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

export default function SearchIcon() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push("/private/search")}>
      <Ionicons name="search-outline" size={24} color="white" />
    </TouchableOpacity>
  );
}
