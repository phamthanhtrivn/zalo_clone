import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";

type Props = {
  length?: number;
  onChange?: (otp: string) => void;
};

export default function OtpInput({ length = 6, onChange }: Props) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const updateOtp = (arr: string[]) => {
    setOtp(arr);

    const code = arr.join("");
    onChange?.(code);
  };

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const cleanText = text.replace(/[^0-9]/g, "");

    if (cleanText.length > 1) {
      // 1. Paste Action (e.g. user pastes full code)
      if (cleanText.length >= 4) {
        const digits = cleanText.slice(0, length).split("");
        const newOtp = Array(length)
          .fill("")
          .map((_, i) => digits[i] || "");

        updateOtp(newOtp);
        inputs.current[length - 1]?.focus();
        return;
      }

      // 2. Type-over (replace existing character with the newly typed one)
      const char = cleanText[cleanText.length - 1] || "";
      const newOtp = [...otp];
      newOtp[index] = char;

      updateOtp(newOtp);

      if (index < length - 1) {
        inputs.current[index + 1]?.focus();
      }
      return;
    }

    // 3. Normal single digit entry
    const newOtp = [...otp];
    newOtp[index] = cleanText;

    updateOtp(newOtp);

    if (cleanText && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      const newOtp = [...otp];

      if (!otp[index] && index > 0) {
        inputs.current[index - 1]?.focus();
        newOtp[index - 1] = "";
      } else {
        newOtp[index] = "";
      }

      updateOtp(newOtp);
    }
  };

  return (
    <View className="flex-row justify-between gap-2">
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            if (ref) inputs.current[index] = ref;
          }}
          className={`w-12 h-14 border-b text-center text-xl ${digit ? "border-graident" : "border-secondary"}`}
          keyboardType="number-pad"
          maxLength={length} // Keep maxLength equal to length to enable native paste suggest options
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) =>
            handleKeyPress(nativeEvent.key, index)
          }
        />
      ))}
    </View>
  );
}
