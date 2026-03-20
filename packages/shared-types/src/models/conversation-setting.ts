


export interface ConversationSetting {
  _id: string;
  userId: string;
  conversationId: string;
  mutedUntil: Date | null;
  pinned: boolean;
  hidden: boolean;
  category: String;
}