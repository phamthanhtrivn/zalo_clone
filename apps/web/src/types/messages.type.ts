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
    file: string | null;
  };
  pinned: boolean;
  recalled: boolean;
  reactions: [ReactionType];
  readReceipts: [ReadReceiptType];
  repliedId: string | null;
  call: string | null;
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
