import type { File } from "./conversation-item.type";

export interface MessagesType {
  _id: string;
  senderId: {
    name: string;
    _id: string;
    profile: {
      name: string;
      avatarUrl: string;
    };
  };
  conversationId: string;
  type: "USER_MESSAGE" | "SYSTEM" | "POLL";
  content: {
    text: string | null;
    icon: string | null;
    files: File[];
    voiceDuration?: number | null;
  };
  pollId?: string;
  poll?: any;
  pinned: boolean;
  recalled: boolean;
  reactions: ReactionType[];
  readReceipts: ReadReceiptType[];
  repliedId: MessagesType | null;
  call: {
    type: "VIDEO" | "VOICE";
    status: string;
    duration: number | null;
  } | null;
  expiresAt: string | null;
  expired?: boolean;
  createdAt: string;
  updatedAt: string;
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
