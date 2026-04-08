//Đây là label tìm kiếm nằm trên header ở mỗi màn hình,
// khi ấn vào sẽ chuyển hướng sang màn hình tìm kiếm

import { Text, TouchableOpacity } from "react-native";

export default function SearchLabel() {
  return (
    <TouchableOpacity>
      <Text className="text-white/65 text-sm">Tìm kiếm</Text>
    </TouchableOpacity>
  );
}
