import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import DateTimePicker from "@react-native-community/datetimepicker";
import formatBirthday from "@/utils/formatBirthday";
import { userService } from "@/services/user.service";
import { updateUserProfile } from "../../store/auth/userInfoSlice";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function ProfileUpdateScreen() {
  const router = useRouter();
  const { userInfo } = useAppSelector((state) => state.userInfo);
  const [name, setName] = useState(userInfo?.profile?.name || "");
  const [gender, setGender] = useState(userInfo?.profile?.gender);

  // const [avatarUri, setAvatarUri] = useState(
  //   userInfo?.profile?.avatarUrl ||
  //     "https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_4_aefd38b259.jpg",
  // );

  const [date, setDate] = useState(
    userInfo?.profile?.birthday
      ? new Date(userInfo.profile.birthday)
      : new Date(),
  );
  const dispatch = useAppDispatch();

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hàm xử lý khi người dùng chọn ngày trên lịch
  const onChangeDate = (event: any, selectedDate: any) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = () => {
    const updateUserInfo = async () => {
      try {
        const formData = new FormData();
        formData.append("profile[name]", name);
        formData.append("profile[gender]", gender);
        formData.append("profile[birthday]", date.toISOString());
        const data = await userService.updateProfile(formData);
        console.log(data);
        dispatch(
          updateUserProfile({
            name: name,
            gender: gender,
            birthday: date.toISOString(),
          }),
        );
        router.back();
      } catch (err) {
        console.log(err);
      }
    };
    updateUserInfo();
    console.log(date);
    console.log(gender);
    console.log(name);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;

      const updateImage = async () => {
        try {
          const formData = new FormData();

          // 1. Cấu hình file ảnh bắt buộc cho React Native
          const filename = localUri.split("/").pop() || "avatar.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          // 2. Append đúng cục file vào (Không dùng chữ 'name')
          formData.append("avatar", {
            uri: localUri,
            name: filename,
            type: type,
          } as any);

          const data = await userService.updateProfile(formData);
          console.log("data update ", data);
          dispatch(
            updateUserProfile({
              avatarUrl: data.profile.avatarUrl,
            }),
          );
        } catch (err) {
          console.log("Lỗi upload ảnh: ", err);
        }
      };

      updateImage();
    }
  };

  return (
    <Container>
      <Header
        gradient
        centerChild={
          <Text className="text-white font-semibold text-sm">
            Chỉnh sửa thông tin
          </Text>
        }
        back
      />

      <ScrollView className="flex-1 px-5 pt-8">
        <View className="flex-row">
          {/* Avatar */}
          <View className="mr-5 relative">
            <Image
              source={{
                uri:
                  userInfo?.profile?.avatarUrl ||
                  "https://wp-cms-media.s3.ap-east-1.amazonaws.com/lay_anh_dai_dien_facebook_dep_4_aefd38b259.jpg",
              }}
              className="w-24 h-24 rounded-full"
            />
            <TouchableOpacity
              onPress={pickImage}
              className="absolute bottom-5 right-2 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm"
            >
              <Feather name="camera" size={16} color="gray" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View className="flex-1 justify-center">
            {/* Tên */}
            <View className="flex-row items-center border-b border-gray-200 pb-2">
              <TextInput
                value={name}
                onChangeText={setName}
                className="flex-1 text-black text-[16px] py-0"
                placeholder="Nhập tên"
              />
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color="black"
              />
            </View>

            {/* Ngày sinh (Đã chuyển thành nút bấm chọn lịch) */}
            <TouchableOpacity
              className="flex-row items-center border-b border-gray-200 pb-2 mt-4"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="flex-1 text-black text-[16px] py-1">
                {formatBirthday(date)}
              </Text>
              {/* Thay đổi icon bút chì thành lịch cho hợp lý */}
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={20}
                color="black"
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}

            {/* Chọn giới tính */}
            <View className="flex-row items-center mt-4">
              <TouchableOpacity
                className="flex-row items-center mr-8"
                onPress={() => setGender("MALE")}
              >
                <Ionicons
                  name={
                    gender === "MALE" ? "checkmark-circle" : "ellipse-outline"
                  }
                  size={24}
                  color={gender === "MALE" ? "#0090FF" : "#D1D5DB"}
                />
                <Text className="text-black text-[16px] ml-2">Nam</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setGender("FEMALE")}
              >
                <Ionicons
                  name={
                    gender === "FEMALE" ? "checkmark-circle" : "ellipse-outline"
                  }
                  size={24}
                  color={gender === "FEMALE" ? "#0090FF" : "#D1D5DB"}
                />
                <Text className="text-black text-[16px] ml-2">Nữ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Nút LƯU */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-[#0090FF] mt-10 mb-8 py-3.5 rounded-full items-center justify-center shadow-sm"
        >
          <Text className="text-white font-bold text-[16px]">LƯU</Text>
        </TouchableOpacity>
      </ScrollView>
    </Container>
  );
}
