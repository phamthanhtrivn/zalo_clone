export interface ConversationItemType {
  conversationId: string;
  type: string;
  name: string;
  avatar: string;
  muted: boolean;
  pinned: boolean;
  hidden: boolean;
  lastMessage: {
    senderName: string;
    content: {
      text: string;
      icon: string;
      file: File;
    };
  };
  lastMessageAt: string;
}

export interface File {
  fileKey: string;
  fileSize: number;
  type: "IMAGE" | "VIDEO" | "LINK";
}
