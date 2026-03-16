//Đây là icon tìm kiếm nằm trên header ở mỗi màn hình,
// khi ấn vào sẽ chuyển hướng sang màn hình tìm kiếm

import { TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function SearchIcon() {
  return (
    <TouchableOpacity>
      <Ionicons name="search-outline" size={24} color="white" />
    </TouchableOpacity>
  );
}
