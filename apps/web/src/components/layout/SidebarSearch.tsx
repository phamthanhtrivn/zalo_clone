import { conversationService } from "@/services/conversation.service";
import { useAppSelector } from "@/store";
import {
  FileText,
  MessageSquare,
  Search,
  UserPlus,
  Users,
  X,
  Loader2,
  Image,
  Video,
  File
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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

const normalizeResults = (value: Partial<SearchResponse> | null | undefined): SearchResponse => ({
  contacts: Array.isArray(value?.contacts) ? value.contacts : [],
  groups: Array.isArray(value?.groups) ? value.groups : [],
  messages: Array.isArray(value?.messages) ? value.messages : [],
  files: Array.isArray(value?.files) ? value.files : [],
});

const FILTERS: Array<{ key: SearchScope; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "contacts", label: "Liên hệ" },
  { key: "messages", label: "Tin nhắn" },
  { key: "files", label: "File" },
];

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: "IMAGE" | "VIDEO" | "FILE") => {
  switch (type) {
    case "IMAGE":
      return <Image className="w-4 h-4 text-blue-500" />;
    case "VIDEO":
      return <Video className="w-4 h-4 text-purple-500" />;
    default:
      return <File className="w-4 h-4 text-gray-500" />;
  }
};

export const SidebarSearch = () => {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsSearching(false);
    setKeyword("");
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user?.userId) return;

    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = window.setTimeout(async () => {
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
    }, 300);

    return () => window.clearTimeout(timeoutId);
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
    const target = messageId
      ? `/conversation/${conversationId}?messageId=${messageId}`
      : `/conversation/${conversationId}`;
    navigate(target);
    setIsSearching(false);
    setKeyword("");
  };

  const handleClear = () => {
    setKeyword("");
    setResults(EMPTY_RESULTS);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1" ref={containerRef}>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={() => {
                  if (keyword.trim()) setIsSearching(true);
                }}
                placeholder="Tìm kiếm"
                className="h-9 pl-9 pr-8 bg-[#f3f4f6] border-0 rounded-full text-sm placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-[#0091ff] focus-visible:bg-white"
              />
              {keyword && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-gray-600 hover:bg-[#f3f4f6] hover:text-[#005ae0] shrink-0"
          >
            <UserPlus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-gray-600 hover:bg-[#f3f4f6] hover:text-[#005ae0] shrink-0"
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Results Overlay - Đè lên ConversationList */}
      {isSearching && keyword.trim() && (
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {/* Filter Tabs */}
          <div className="flex items-center gap-6 px-4 py-2 border-b border-gray-100 shrink-0">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setScope(filter.key)}
                className={`relative pb-2 text-sm font-medium transition-colors ${scope === filter.key
                    ? "text-[#005ae0]"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {filter.label}
                {scope === filter.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#005ae0]" />
                )}
              </button>
            ))}
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-[#005ae0] animate-spin" />
              </div>
            ) : totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 mb-4">
                  <Search className="w-full h-full text-gray-300" strokeWidth={1} />
                </div>
                <p className="text-base font-medium text-gray-700 mb-1">
                  Không tìm thấy kết quả
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Vui lòng thử lại từ khóa khác
                </p>
              </div>
            ) : (
              <>
                {/* Contacts Results */}
                {results.contacts.length > 0 && (
                  <div className="py-1">
                    {results.contacts.map((contact) => (
                      <button
                        key={contact.conversationId}
                        onClick={() => openConversation(contact.conversationId)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={contact.avatar || undefined} />
                          <AvatarFallback className="bg-[#e5efff] text-[#005ae0]">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {contact.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages Results */}
                {results.messages.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    {results.messages.map((message) => (
                      <button
                        key={message.messageId}
                        onClick={() => openConversation(message.conversationId, message.messageId)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#e5efff] flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 text-[#005ae0]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900">
                              {message.conversationName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{message.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{message.senderName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Files Results */}
                {results.files.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    {results.files.map((item) => (
                      <button
                        key={`${item.messageId}-${item.file.fileName}`}
                        onClick={() => openConversation(item.conversationId, item.messageId)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          {getFileIcon(item.file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate mb-0.5">
                            {item.file.fileName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{item.conversationName}</span>
                            <span>•</span>
                            <span>{formatFileSize(item.file.fileSize)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};