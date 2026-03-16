import { Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "blue", headerShown: false }}>
      <Tabs.Screen
        name="chat"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons size={24} name="message" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: "Danh bạ",
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons size={24} name="contact-page" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="personal"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 size={24} name="user-circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
