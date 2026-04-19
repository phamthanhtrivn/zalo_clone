import type { File } from "./conversation-item.type";

export interface MessagesType {
  _id: string;
  senderId: {
    _id: string;
    profile: {
      name: string;
      avatarUrl: string;
    };
  };
  conversationId: string;
  content: {
    text: string | null;
    icon: string | null;

    files: File[];
  };
  pinned: boolean;
  recalled: boolean;
  reactions: ReactionType[];
  readReceipts: ReadReceiptType[];
  repliedId: string | null;
  call: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  expired?: boolean;


}

export interface ReactionType {
  userId: {
    _id: string;
    profile: {
      name: string;
      avatarUrl: string;
    };
  };
  emoji: {
    name: string;
    quantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ReadReceiptType {
  userId: {
    _id: string;
    profile: {
      name: string;
      avatarUrl: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}
