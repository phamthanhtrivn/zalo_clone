import { Content } from 'src/modules/messages/schemas/message.schema';

export class ConversationItemDto {
  conversationId: string;
  type: string;
  name: string;
  avatar?: string;
  otherMemberId?: string;
  lastMessage?: {
    senderName: string;
    content: Content;
    recalled: boolean;
  };
  lastMessageAt: Date;
}
