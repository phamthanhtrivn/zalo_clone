import { View, Text, TouchableOpacity } from "react-native";

export default function TabSwitcher({ activeTab, onTabChange }: any) {
  const tabs = [
    { id: "friends", label: "Bạn bè" },
    { id: "groups", label: "Nhóm" },
  ];

  return (
    <View className="flex-row bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          className={`flex-1 py-3 items-center ${
            activeTab === tab.id ? "border-b-2 border-blue-600" : ""
          }`}
        >
          <Text className={`font-medium ${activeTab === tab.id ? "text-blue-600" : "text-gray-500"}`}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}