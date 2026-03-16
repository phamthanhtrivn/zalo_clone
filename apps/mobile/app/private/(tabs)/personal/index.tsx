import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";
import { Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

export default function Personal() {
  const router = useRouter();
  const handleSetting = () => {
    router.push("/private/setting");
  };
  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
        rightChild={
          <TouchableOpacity onPress={handleSetting}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        }
      />
    </Container>
  );
}
