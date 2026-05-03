import { ScrollView, View, ActivityIndicator, RefreshControl } from "react-native";
import { COLORS } from "@/constants/colors";

import PromoBanner from "./PromoBanner";
import Composer from "./Composer";
import StatusPill from "./StatusPill";
import StoriesStrip from "./StoriesStrip";
import PostCard from "./PostCard";
import SectionDivider from "./SectionDivider";

export default function DiaryContent({ avatar, posts, loading, onRefresh, refreshing }: any) {
    return (
        <ScrollView
            className="flex-1 bg-[#eef2f7]"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                />
            }
        >
            <PromoBanner />
            <SectionDivider />
            <Composer avatar={avatar} />
            <SectionDivider />
            <StatusPill />
            <SectionDivider />
            <StoriesStrip />
            <SectionDivider />

            {loading && (
                <View className="py-10">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            {Array.isArray(posts) &&
                posts.map((post, index) => (
                    <View key={post.id || post._id}>
                        <PostCard item={post} />
                        {index < posts.length - 1 && <SectionDivider />}
                    </View>
                ))}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
}