import { ThumbsUp, X } from "lucide-react";
import { REACTION_EMOJIS, EMOJI_MAP, EmojiType } from "@/constants/emoji.constant";
import type { ReactionType } from "@/types/messages.type";

interface Props {
  messageId: string;
  reactionMessage: (emojiType: EmojiType, messageId: string) => void;
  messageReactions: ReactionType[];
  isMe: boolean;
  removeReaction: (messageId: string) => void;
}

const CURRENT_USER_ID = "699d2b94f9075fe800282901"

export const ReactionPicker = ({ messageId, reactionMessage, messageReactions, isMe, removeReaction }: Props) => {
  return (
    <div
      className={`
        absolute -bottom-3 right-2 z-10
        opacity-0 group-hover:opacity-100
        transition-all duration-200
        group/reaction
      `}
    >
      <button
        className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 cursor-pointer transition-colors group-hover/reaction:text-blue-500 group-hover/reaction:bg-blue-50"
        title="Thả cảm xúc"
      >
        <ThumbsUp size={12} />
      </button>

      {/* REACTION EMOJI PICKER */}
      <div
        className={`
          absolute bottom-full pb-1 ${isMe ? "-right-2.5" : "-left-2.5"}
          hidden group-hover/reaction:flex flex-col justify-end items-center z-50
        `}
      >
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-lg border border-gray-100 animate-in zoom-in-95 duration-200">
          {REACTION_EMOJIS.map((emoji, idx) => (
            <button
              onClick={() => reactionMessage(emoji, messageId)}
              key={idx}
              className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 transition-transform origin-bottom cursor-pointer rounded-full hover:bg-gray-100"
            >
              {EMOJI_MAP[emoji]}
            </button>
          ))}
          {messageReactions.length > 0 && messageReactions.some(r => r.userId._id === CURRENT_USER_ID) && (
            <button
              onClick={() => removeReaction(messageId)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 transition-transform origin-bottom cursor-pointer rounded-full hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
