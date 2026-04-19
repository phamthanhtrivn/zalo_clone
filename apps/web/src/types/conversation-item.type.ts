export interface ConversationItemType {
  conversationId: string;
  type: string;
  name: string;
  avatar: string;
  muted: boolean;
  pinned: boolean;
  hidden: boolean;
  category?: ConversationCategory;
  deletedAt: Date | null;
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
  type: "IMAGE" | "VIDEO" | "FILE";
}


export type ConversationCategory =
  | 'customer'
  | 'family'
  | 'work'
  | 'friends'
  | 'later'
  | 'colleague'
  | null;
