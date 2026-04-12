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
  lastMessage: {
    _id: string;
    senderName: string;
    content: {
      text: string;
      icon: string;
      file: File;
    };
    recalled: boolean;
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
  | 'customer'
  | 'family'
  | 'work'
  | 'friends'
  | 'later'
  | 'colleague'
  | null;
