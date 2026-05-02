import { Content } from 'src/modules/messages/schemas/message.schema';

export type ConversationCategory =
  | 'customer'
  | 'family'
  | 'work'
  | 'friends'
  | 'later'
  | 'colleague'
  | null;

export class ConversationItemDto {
  conversationId: string;
  type: string | undefined;
  name: string | undefined;
  avatar?: string;
  isStranger?: boolean;

  otherMemberId?: string;

  mutedUntil: Date | null | undefined;
  pinned: boolean | undefined;
  hidden: boolean | undefined;
  category?: ConversationCategory;
  deletedAt: Date | null | undefined;
  expireDuration: number | undefined;

  lastMessage?: {
    _id: string;
    senderName: string;
    content: Content;
    recalled: boolean;
    type?: string;
    call?: {
      type?: string;
      status?: string;
      duration?: number | null;
    };
    expired?: boolean;
    expiresAt?: Date | null;
  };
  lastMessageAt: Date | undefined;
}
