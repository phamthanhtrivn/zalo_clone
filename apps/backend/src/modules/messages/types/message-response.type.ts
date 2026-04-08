import { Types } from 'mongoose';

export type FileType = 'IMAGE' | 'VIDEO' | 'FILE';

export interface MessageFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  type: FileType;
}

export interface MessageContent {
  text?: string;
  icon?: string;
  file?: MessageFile;
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
}

export interface UserLite {
  _id: Types.ObjectId;
  profile: UserProfile;
}

export interface MessageResponse {
  _id: Types.ObjectId;
  content: MessageContent;
  senderId: UserLite;
  createdAt: Date;

  readReceipts?: {
    userId: UserLite;
    createdAt: Date;
    updatedAt: Date;
  }[];

  reactions?: {
    userId: UserLite;
    createdAt: Date;
    updatedAt: Date;
  }[];

  repliedId?: {
    _id: Types.ObjectId;
    senderId: UserLite;
  };
}
