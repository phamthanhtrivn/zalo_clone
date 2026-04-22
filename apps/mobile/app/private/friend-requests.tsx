import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import ReceivedTab from "@/components/contact/ReceivedTab";
import SentTab from "@/components/contact/SentTab";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";

export default function FriendRequestsScreen() {
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent'

  return (
    <Container>
      <View className="flex-1 bg-white">
        <Header
          gradient
          back
          centerChild={
            <Text className="text-white font-semibold text-sm text-center">
              Lời mời kết bạn
            </Text>
          }
        />

        {/* Custom Tab Switcher */}
        <View className="flex-row border-b border-gray-200">
          <TouchableOpacity
            onPress={() => setActiveTab("received")}
            className={`flex-1 py-3 items-center ${activeTab === "received" ? "border-b-2 border-black" : ""}`}
          >
            <Text
              className={`font-medium ${activeTab === "received" ? "text-black" : "text-gray-500"}`}
            >
              Đã nhận
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("sent")}
            className={`flex-1 py-3 items-center ${activeTab === "sent" ? "border-b-2 border-black" : ""}`}
          >
            <Text
              className={`font-medium ${activeTab === "sent" ? "text-black" : "text-gray-500"}`}
            >
              Đã gửi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 bg-[#f4f5f7]">
          {activeTab === "received" ? <ReceivedTab /> : <SentTab />}
        </ScrollView>
      </View>
    </Container>
  );
}
