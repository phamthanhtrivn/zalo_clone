import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

export const getDeviceId = async () => {
  let deviceId = await SecureStore.getItemAsync("device_id");

  if (!deviceId) {
    deviceId = uuidv4();
    await SecureStore.setItemAsync("device_id", deviceId);
  }

  return deviceId;
};
