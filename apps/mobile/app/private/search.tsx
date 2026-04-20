import Container from "@/components/common/Container";
import { conversationService } from "@/services/conversation.service";
import { useAppSelector } from "@/store/store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type SearchScope = "all" | "contacts" | "messages" | "files" | "groups";

type SearchResponse = {
  contacts: Array<{
    conversationId: string;
    name: string;
    avatar?: string | null;
    lastMessageAt: string;
  }>;
  groups: Array<{
    conversationId: string;
    name: string;
    avatar?: string | null;
    lastMessageAt: string;
    memberLabel?: string;
  }>;
  messages: Array<{
    messageId: string;
    conversationId: string;
    conversationName: string;
    conversationAvatar?: string | null;
    senderName: string;
    text: string;
    createdAt: string;
  }>;
  files: Array<{
    messageId: string;
    conversationId: string;
    conversationName: string;
    conversationAvatar?: string | null;
    senderName: string;
    createdAt: string;
    file: {
      fileName: string;
      fileSize: number;
      type: "IMAGE" | "VIDEO" | "FILE";
      fileKey: string;
    };
  }>;
};

const EMPTY_RESULTS: SearchResponse = {
  contacts: [],
  groups: [],
  messages: [],
  files: [],
};

const normalizeResults = (
  value: Partial<SearchResponse> | null | undefined,
): SearchResponse => ({
  contacts: Array.isArray(value?.contacts) ? value.contacts : [],
  groups: Array.isArray(value?.groups) ? value.groups : [],
  messages: Array.isArray(value?.messages) ? value.messages : [],
  files: Array.isArray(value?.files) ? value.files : [],
});

const FILTERS: Array<{ key: SearchScope; label: string }> = [
  { key: "all", label: "Tat ca" },
  { key: "contacts", label: "Lien he" },
  { key: "messages", label: "Tin nhan" },
  { key: "files", label: "File" },
  { key: "groups", label: "Nhom" },
];

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
      {title}
    </Text>
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      {children}
    </View>
  </View>
);

export default function SearchScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);

  useEffect(() => {
    if (!user?.userId) return;

    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await conversationService.search(
          user.userId,
          trimmedKeyword,
          scope,
          8,
        );
        setResults(normalizeResults(response));
      } catch (error) {
        console.error("Search failed:", error);
        setResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [keyword, scope, user?.userId]);

  const totalResults = useMemo(
    () =>
      (results.contacts?.length ?? 0) +
      (results.groups?.length ?? 0) +
      (results.messages?.length ?? 0) +
      (results.files?.length ?? 0),
    [results],
  );

  const openConversation = (conversationId: string, messageId?: string) => {
    router.push({
      pathname: "/private/chat/[id]",
      params: {
        id: conversationId,
        ...(messageId ? { messageId } : {}),
      },
    });
  };

  return (
    <Container>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "#0068ff",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 42,
          }}
        >
          <Ionicons name="search-outline" size={18} color="white" />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tim lien he, tin nhan, file, nhom"
            placeholderTextColor="rgba(255,255,255,0.72)"
            autoFocus
            style={{
              flex: 1,
              marginLeft: 8,
              color: "white",
              fontSize: 14,
            }}
          />
          {!!keyword && (
            <TouchableOpacity onPress={() => setKeyword("")}>
              <Ionicons name="close-circle" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
        >
          {FILTERS.map((filter) => {
            const isActive = scope === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setScope(filter.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isActive ? "#0068ff" : "white",
                  borderWidth: 1,
                  borderColor: isActive ? "#0068ff" : "#d1d5db",
                }}
              >
                <Text
                  style={{
                    color: isActive ? "white" : "#374151",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {!keyword.trim() ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                paddingHorizontal: 24,
              }}
            >
              <Ionicons name="search" size={42} color="#9ca3af" />
              <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "700", color: "#111827" }}>
                Tim kiem toan bo hoi thoai
              </Text>
              <Text style={{ marginTop: 6, textAlign: "center", color: "#6b7280" }}>
                Nhap tu khoa de loc theo lien he, nhom, noi dung tin nhan hoac ten file.
              </Text>
            </View>
          ) : loading ? (
            <View style={{ paddingTop: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0068ff" />
            </View>
          ) : totalResults === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                paddingHorizontal: 24,
              }}
            >
              <MaterialIcons name="search-off" size={42} color="#9ca3af" />
              <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "700", color: "#111827" }}>
                Khong co ket qua phu hop
              </Text>
            </View>
          ) : (
            <>
              {results.contacts.length > 0 && (
                <Section title="Lien he">
                  {results.contacts.map((contact, index) => (
                    <Pressable
                      key={contact.conversationId}
                      onPress={() => openConversation(contact.conversationId)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderBottomWidth: index === results.contacts.length - 1 ? 0 : 1,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                        {contact.name}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        Mo cuoc tro chuyen
                      </Text>
                    </Pressable>
                  ))}
                </Section>
              )}

              {results.groups.length > 0 && (
                <Section title="Nhom">
                  {results.groups.map((group, index) => (
                    <Pressable
                      key={group.conversationId}
                      onPress={() => openConversation(group.conversationId)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderBottomWidth: index === results.groups.length - 1 ? 0 : 1,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                        {group.name}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        Tro chuyen nhom
                      </Text>
                    </Pressable>
                  ))}
                </Section>
              )}

              {results.messages.length > 0 && (
                <Section title="Tin nhan">
                  {results.messages.map((message, index) => (
                    <Pressable
                      key={message.messageId}
                      onPress={() => openConversation(message.conversationId, message.messageId)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderBottomWidth: index === results.messages.length - 1 ? 0 : 1,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#2563eb", fontWeight: "700" }}>
                        {message.conversationName}
                      </Text>
                      <Text
                        style={{ marginTop: 6, fontSize: 14, color: "#111827" }}
                        numberOfLines={2}
                      >
                        {message.text}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {message.senderName}
                      </Text>
                    </Pressable>
                  ))}
                </Section>
              )}

              {results.files.length > 0 && (
                <Section title="File">
                  {results.files.map((item, index) => (
                    <Pressable
                      key={`${item.messageId}-${item.file.fileName}`}
                      onPress={() => openConversation(item.conversationId, item.messageId)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderBottomWidth: index === results.files.length - 1 ? 0 : 1,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#2563eb", fontWeight: "700" }}>
                        {item.conversationName}
                      </Text>
                      <Text style={{ marginTop: 6, fontSize: 14, color: "#111827", fontWeight: "600" }}>
                        {item.file.fileName}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {item.file.type} • {formatFileSize(item.file.fileSize)}
                      </Text>
                    </Pressable>
                  ))}
                </Section>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Container>
  );
}
