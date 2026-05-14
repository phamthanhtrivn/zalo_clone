import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
};

const ConversationPinModal: React.FC<Props> = ({
  visible,
  title,
  description,
  confirmLabel = "Xác nhận",
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [pin, setPin] = useState("");
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) {
      setPin("");
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleSubmit = () => {
    if (pin.length !== 4 || loading) return;
    onSubmit(pin);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/45 items-center justify-center px-6" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="w-full max-w-[360px] rounded-[22px] bg-white px-5 py-5"
        >
          <Text className="text-[20px] font-semibold text-[#111827]">
            {title}
          </Text>
          {description ? (
            <Text className="mt-2 text-[14px] leading-5 text-[#6b7280]">
              {description}
            </Text>
          ) : null}

          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            className="mt-5 rounded-2xl border border-[#d1d5db] px-4 py-3 text-center text-[26px] tracking-[12px] text-[#111827]"
            placeholder="••••"
            placeholderTextColor="#9ca3af"
          />

          <View className="mt-5 flex-row justify-end gap-3">
            <TouchableOpacity
              className="rounded-2xl bg-[#f3f4f6] px-5 py-3"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-[15px] font-semibold text-[#374151]">
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`min-w-[112px] rounded-2xl px-5 py-3 ${pin.length === 4 ? "bg-[#0068ff]" : "bg-[#93c5fd]"}`}
              onPress={handleSubmit}
              disabled={pin.length !== 4 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-[15px] font-semibold text-white">
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ConversationPinModal;
