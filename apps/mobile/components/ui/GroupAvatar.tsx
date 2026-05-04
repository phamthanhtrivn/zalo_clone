import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { getAvatarData, getColorByName } from "@/utils/avatar.util";

interface GroupAvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

/**
 * GroupAvatar Component - Cross-Platform Consistent Implementation
 */
const GroupAvatar: React.FC<GroupAvatarProps> = ({ uri, name, size = 48 }) => {
  const [imageError, setImageError] = useState(false);

  // Unified business logic from utils
  const { initials, isGroupIcon } = useMemo(() => getAvatarData(name), [name]);
  const backgroundColor = useMemo(() => getColorByName(name), [name]);

  const showFallback = !uri || imageError;

  const containerStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backgroundColor,
  }), [size, backgroundColor]);

  const initialsStyle = useMemo(() => ({
    fontSize: size * 0.45,
  }), [size]);

  const iconSize = size * 0.6;

  return (
    <View style={[styles.baseContainer, containerStyle]}>
      {!showFallback ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.fallbackContainer}>
          {isGroupIcon ? (
            <MaterialIcons name="people" size={iconSize} color="#FFFFFF" />
          ) : (
            <Text style={[styles.initials, initialsStyle]}>
              {initials}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
});

export default React.memo(GroupAvatar);
