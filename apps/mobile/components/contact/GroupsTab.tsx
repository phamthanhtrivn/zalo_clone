import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GroupItem from "./GroupItem";

export default function GroupsTab() {
  return (
    <ScrollView className="flex-1 bg-white">
      <TouchableOpacity className="px-4 py-4 flex-row items-center border-b border-gray-100">
        <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center">
          <MaterialIcons name="group-add" size={26} color="#3b82f6" />
        </View>
        <Text className="ml-4 text-base text-blue-600 font-medium">Tạo nhóm mới</Text>
      </TouchableOpacity>

      <View className="bg-gray-100 px-4 py-2 flex-row justify-between items-center">
        <Text className="text-xs font-bold text-gray-600 uppercase">Nhóm đang tham gia (79)</Text>
        <MaterialIcons name="sort" size={18} color="#666" />
      </View>

      {/* Danh sách nhóm mẫu */}
      <GroupItem 
        name="FIT_SE_KTPM_Khóa 18" 
        lastMsg="[Link] Tuyển dụng..." 
        time="1 giờ" 
      />
      <GroupItem 
        name="Nhóm CNM" 
        lastMsg="Ok" 
        time="2 giờ" 
      />
    </ScrollView>
  );
}
