import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchUserById } from "@/store/auth/userInfoSlice";

export default function TabLayout() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user?.userId) {
      dispatch(fetchUserById(user.userId));
    }
  }, [dispatch, user?.userId]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0068ff",
        headerShown: false,
      }}
    >
      {/* CHAT */}
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              size={focused ? 26 : 22}
              name="message"
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) =>
            focused ? (
              <Text style={{ color, fontSize: 12 }}>Tin nhắn</Text>
            ) : null,
        }}
      />

      {/* CONTACT */}
      <Tabs.Screen
        name="contact"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              size={focused ? 26 : 22}
              name="contact-page"
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) =>
            focused ? (
              <Text style={{ color, fontSize: 12 }}>Danh bạ</Text>
            ) : null,
        }}
      />

      {/* SOCIAL */}
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={focused ? 26 : 22}
              name="newspaper-outline"
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) =>
            focused ? (
              <Text style={{ color, fontSize: 12 }}>Tường nhà</Text>
            ) : null,
        }}
      />

      {/* PERSONAL */}
      <Tabs.Screen
        name="personal"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5
              size={focused ? 26 : 22}
              name="user-circle"
              color={color}
            />
          ),
          tabBarLabel: ({ focused, color }) =>
            focused ? (
              <Text style={{ color, fontSize: 12 }}>Cá nhân</Text>
            ) : null,
        }}
      />
    </Tabs>
  );
}