export interface ConversationItemType {
  conversationId: string;
  type: string; // "DIRECT" | "GROUP"
  name: string;
  avatar: string;

  // Dữ liệu phục vụ Video Call & Chat (từ nhánh của em)
  otherMemberId?: string | null;
  unreadCount?: number;

  // Dữ liệu phục vụ quản lý hội thoại (từ nhánh PhamThanhTri)
  muted: boolean;
  mutedUntil?: string | null; // Có thể bổ sung thêm để xử lý logic tắt thông báo có thời hạn
  pinned: boolean;
  hidden: boolean;
  category?: ConversationCategory;
  deletedAt: string | Date | null;
  expireDuration: number;

  lastMessage: {
    _id: string;
    senderName: string;
    content: {
      text: string;
      icon: string;
      file: File;
    };
    recalled: boolean;
    type?: string; // Dùng để phân loại CALL, TEXT, MEDIA...
  };
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
