export interface ConversationItemType {
  conversationId: string;
  type: string;
  name: string;
  avatar: string;
  muted: boolean;
  mutedUntil: Date | null;
  pinned: boolean;
  hidden: boolean;
  category?: ConversationCategory;
  deletedAt: Date | null;
  expireDuration: number;
  lastMessage: {
    _id: string;
    senderName: string;
    content: {
      text: string;
      icon: string;
      files: File[];
      voiceDuration?: number | null;
    };
    recalled: boolean;
    expired?: boolean;
    expiresAt?: string | null;
  };
  unreadCount: number;
  lastMessageAt: string;
}

export interface File {
  fileKey: string;
  fileName: string;
  fileSize: number;
  type: "IMAGE" | "VIDEO" | "FILE" | "VOICE";
}

export type ConversationCategory =
  | "customer"
  | "family"
  | "work"
  | "friends"
  | "later"
  | "colleague"
  | null;
