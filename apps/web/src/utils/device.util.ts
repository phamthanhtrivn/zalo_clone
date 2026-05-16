export const getDeviceId = () => {
  let deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback cho môi trường HTTP (không phải Secure Context)
      deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    }
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
};
