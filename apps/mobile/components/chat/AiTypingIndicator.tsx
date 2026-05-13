import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import GroupAvatar from "../ui/GroupAvatar";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
} from "react-native-reanimated";

interface AiTypingIndicatorProps {
  status: "thinking" | "typing" | null;
  streamingText?: string;
  botAvatar?: string;
}

const AiTypingIndicator: React.FC<AiTypingIndicatorProps> = ({
  status,
  streamingText,
  botAvatar,
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (status === "thinking") {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!status) return null;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <GroupAvatar uri={botAvatar} name="Zola AI" size={32} />
      </View>
      <View style={styles.bubble}>
        {status === "thinking" ? (
          <Animated.Text style={[styles.thinkingText, animatedStyle]}>
            AI đang suy nghĩ...
          </Animated.Text>
        ) : (
          <Markdown style={markdownStyles}>
            {String(streamingText || "").replace(/<br\s*\/?>/gi, "\n")}
          </Markdown>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    marginVertical: 8,
    gap: 8,
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  bubble: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thinkingText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  streamingText: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },
});

const markdownStyles = {
  body: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: "#f9fafb",
  },
  th: {
    padding: 6,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    fontWeight: "700" as const,
  },
  td: {
    padding: 6,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  code_inline: {
    backgroundColor: "#f3f4f6",
    padding: 2,
    borderRadius: 4,
    fontFamily: "System",
  },
};

export default AiTypingIndicator;
