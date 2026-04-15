import { Platform, ToastAndroid, Alert } from "react-native";

export const showToast = (message: string, isLong: boolean = false) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, isLong ? ToastAndroid.LONG : ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};
