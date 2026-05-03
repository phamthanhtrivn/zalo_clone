import type { File } from "./conversation-item.type";

export interface PollOptionType {
  _id: string;
  text: string;
  voters: {
    userId: string;
    name: string;
    avatar: string;
  }[];
  voteCount: number;
}

export interface PollType {
  _id: string;
  title: string;
  options: PollOptionType[];
  isMultipleChoice: boolean;
  allowAddOptions: boolean;
  creatorId: string;
  totalParticipants?: number;
}

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
    voiceDuration?: number | null;
  };
  pinned: boolean;
  recalled: boolean;
  reactions: ReactionType[];
  readReceipts: ReadReceiptType[];

  repliedId: string | null;
  call?: {
    type: "VIDEO" | "VOICE";
    status: string;
    duration: number | null;
  };
  createdAt: string;
  updatedAt: string;

  type: string;
  pollId?: string | null;
  poll?: PollType | null;

  expired?: boolean;
  expiredAt: string | null;
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

