export const EmojiType = {
  LIKE: 'LIKE',
  LOVE: 'LOVE',
  HAHA: 'HAHA',
  WOW: 'WOW',
  SAD: 'SAD',
  ANGRY: 'ANGRY',
} as const;

export type EmojiType = typeof EmojiType[keyof typeof EmojiType];

export const EMOJI_MAP: Record<EmojiType, string> = {
  [EmojiType.LIKE]: '👍',
  [EmojiType.LOVE]: '❤️',
  [EmojiType.HAHA]: '😂',
  [EmojiType.WOW]: '😲',
  [EmojiType.SAD]: '😢',
  [EmojiType.ANGRY]: '😡',
};

export const REACTION_EMOJIS = Object.keys(EMOJI_MAP) as EmojiType[];
