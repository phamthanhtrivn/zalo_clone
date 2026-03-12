export interface ConversationItemType {
  conversationId: string;
  type: string;
  name: string;
  avatar: string;
  lastMessage: {
    senderName: string;
    content: {
      text: string;
      icon: string;
      file: string;
    };
  };
  lastMessageAt: string;
}
