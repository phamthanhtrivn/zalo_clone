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
  conversationId: string | undefined;
  type: string | undefined;
  name: string | undefined;
  avatar?: string;

  // Dữ liệu phục vụ Video Call (từ nhánh của em)
  otherMemberId?: string;

  // Dữ liệu phục vụ quản lý hội thoại (từ nhánh PhamThanhTri)
  mutedUntil: Date | null | undefined;
  pinned: boolean | undefined;
  hidden: boolean | undefined;
  category?: ConversationCategory;
  deletedAt: Date | null | undefined;
  expireDuration: number | undefined;

  lastMessage?: {
    senderName: string;
    content: Content;
    recalled: boolean;
  };
  lastMessageAt: Date | undefined;
}
