export interface ConversationItemType {
  conversationId: string;
  type: string;
  name: string;
  avatar: string;
  lastMessage: {
    senderId: string;
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
