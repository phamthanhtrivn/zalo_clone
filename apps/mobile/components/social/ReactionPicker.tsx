import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    TouchableWithoutFeedback,
    StyleSheet,
} from "react-native";

export type ReactionType = "LIKE" | "HEART" | "HAHA" | "WOW" | "SAD" | "CARE";

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
    { type: "LIKE",  emoji: "👍", label: "Thích" },
    { type: "HEART", emoji: "❤️", label: "Tim"   },
    { type: "HAHA",  emoji: "😆", label: "Haha"  },
    { type: "WOW",   emoji: "😮", label: "Wow"   },
    { type: "SAD",   emoji: "😢", label: "Buồn"  },
    { type: "CARE",  emoji: "🤗", label: "Care"  },
];

interface Props {
    visible: boolean;
    onSelect: (type: ReactionType) => void;
    onClose: () => void;
    /** Vị trí Y của anchor (nút Thích) để popup nổi lên trên */
    anchorY?: number;
}

export default function ReactionPicker({ visible, onSelect, onClose, anchorY = 0 }: Props) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 120,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={StyleSheet.absoluteFill}>
                    {/* Overlay mờ nhẹ */}
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim, backgroundColor: "rgba(0,0,0,0.15)" }]} />

                    {/* Popup bubble */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            {
                                bottom: anchorY > 0 ? anchorY + 8 : 200,
                                opacity: opacityAnim,
                                transform: [{ scale: scaleAnim }, { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                            },
                        ]}
                    >
                        {REACTIONS.map((r) => (
                            <TouchableOpacity
                                key={r.type}
                                style={styles.reactionBtn}
                                onPress={() => {
                                    onSelect(r.type);
                                    onClose();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.emoji}>{r.emoji}</Text>
                                <Text style={styles.label}>{r.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bubble: {
        position: "absolute",
        left: 16,
        right: 16,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 40,
        paddingVertical: 10,
        paddingHorizontal: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 10,
    },
    reactionBtn: {
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    emoji: {
        fontSize: 32,
    },
    label: {
        fontSize: 10,
        color: "#374151",
        marginTop: 2,
        fontWeight: "600",
    },
});
