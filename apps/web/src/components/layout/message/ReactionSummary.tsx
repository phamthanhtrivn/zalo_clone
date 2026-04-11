import { EMOJI_MAP, EmojiType } from "@/constants/emoji.constant";
import type { ReactionType } from "@/types/messages.type";

interface Props {
  reactions: ReactionType[];
  onClick: (reactions: ReactionType[]) => void;
}

export const ReactionSummary = ({ reactions, onClick }: Props) => {
  if (!reactions || reactions.length === 0) return null;

  const { emojiCountMap, totalQuantity } = reactions.reduce(
    (acc, r) => {
      r.emoji.forEach((e) => {
        acc.emojiCountMap[e.name] =
          (acc.emojiCountMap[e.name] || 0) + e.quantity;

        acc.totalQuantity += e.quantity;
      });

      return acc;
    },
    {
      emojiCountMap: {} as Record<string, number>,
      totalQuantity: 0,
    },
  );

  const sortedEmojis = Object.entries(emojiCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return (
    <div
      onClick={() => onClick(reactions)}
      className={`
        absolute -bottom-3 right-9
        flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-full shadow-sm border border-gray-100 z-10
        cursor-pointer hover:bg-gray-50 transition-colors
      `}
    >
      <div className="flex -space-x-[0.5] ">
        {sortedEmojis.slice(0, 3).map((name, i) => (
          <span key={i} className="text-[12px]">
            {EMOJI_MAP[name as EmojiType] || name}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-gray-500 font-medium">
        {totalQuantity}
      </span>
    </div>
  );
};
