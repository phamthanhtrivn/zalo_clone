import { Content } from 'src/modules/messages/schemas/message.schema';

export class ConversationItemDto {
  conversationId: string;
  type: string;
  name: string;
  avatar?: string;
  mutedUntil: Date | null;
  pinned: boolean;
  hidden: boolean;
  category?: ConversationCategory;
  deletedAt: Date | null;
  expireDuration: number;
  lastMessage?: {
    _id: string;
    senderName: string;
    content: Content;
    recalled: boolean;
    expired?: boolean;
    expiresAt?: Date | null;
  };
  lastMessageAt: Date;
}

export type ConversationCategory =
  | 'customer'
  | 'family'
  | 'work'
  | 'friends'
  | 'later'
  | 'colleague'
  | null;
