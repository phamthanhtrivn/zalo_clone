import React, { useState } from "react";
import { View, Text, Image, ImageProps, ViewProps } from "react-native";

type AvatarProps = {
    uri?: string;
    name?: string;
    size?: number;
} & ViewProps;

export const Avatar: React.FC<AvatarProps> = ({
    uri,
    name,
    size = 40,
    style,
    ...props
}) => {
    const [error, setError] = useState(false);

    const showFallback = !uri || error;

    return (
        <View
            {...props}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    overflow: "hidden",
                    backgroundColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                },
                style,
            ]}
        >
            {!showFallback ? (
                <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onError={() => setError(true)}
                />
            ) : (
                <Text
                    style={{
                        fontSize: size / 2.5,
                        fontWeight: "600",
                        color: "#6b7280",
                    }}
                >
                    {name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
            )}
        </View>
    );
};