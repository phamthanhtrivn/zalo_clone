export interface ConversationItemType {
  conversationId: string;
  type: string; // "DIRECT" | "GROUP"
  name: string;
  avatar: string;
  otherMemberId?: string | null;
  unreadCount?: number;
  muted: boolean;
  mutedUntil?: string | null;
  pinned: boolean;
  hidden: boolean;
  category?: ConversationCategory;
  deletedAt: string | Date | null;
  expireDuration: number;
  mutedUntil: Number | null;
  lastMessage: {
    _id: string;
    senderName: string;
    content: {
      text: string;
      icon: string;
      file: File;
    };
    recalled: boolean;
    type?: string;
    expired?: boolean;
  };
  unreadCount: number;
  lastMessageAt: string;
}

export interface File {
  fileKey: string;
  fileName: string;
  fileSize: number;
  type: "IMAGE" | "VIDEO" | "FILE";
}

export type ConversationCategory =
  | "customer"
  | "family"
  | "work"
  | "friends"
  | "later"
  | "colleague"
  | null;
