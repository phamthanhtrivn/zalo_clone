import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

interface Props {
  onSelect: (emoji: string) => void;
}

const EmojiPickerCustom = ({ onSelect }: Props) => {
  return (
    <div className="shadow-xl rounded-xl overflow-hidden">
      <EmojiPicker
        onEmojiClick={(emojiData: EmojiClickData) => {
          onSelect(emojiData.emoji);
        }}
        previewConfig={{ showPreview: false }}
        width={300}
        height={400}
      />
    </div>
  );
};

export default EmojiPickerCustom;
