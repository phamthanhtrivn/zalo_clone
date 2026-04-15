import { Text, TouchableOpacity } from "react-native";

const MenuItem = ({
    label,
    onPress,
    danger,
}: {
    label: string;
    onPress: () => void;
    danger?: boolean;
}) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
        }}
    >
        <Text
            style={{
                fontSize: 14,
                color: danger ? "#ef4444" : "#111827",
            }}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

export default MenuItem;