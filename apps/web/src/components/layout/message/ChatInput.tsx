import {
  Smile,
  Paperclip,
  Image as ImageIcon,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

type Props = {
  chatName: string;
  onSendMessage: (text: string) => void;
  onSendFiles: (files: FileList) => void;
};

const ChatInput = ({ chatName, onSendMessage, onSendFiles }: Props) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const handleSelectEmoji = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    setText((prev) => {
      const newText =
        prev.substring(0, start) + emojiData.emoji + prev.substring(end);

      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + emojiData.emoji.length;
        textarea.setSelectionRange(pos, pos);
      });

      return newText;
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";

      const maxHeight = 10 * 24; // ~10 dòng (24px mỗi dòng)
      const newHeight = Math.min(el.scrollHeight, maxHeight);

      el.style.height = newHeight + "px";
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onSendFiles(e.target.files);
      e.target.value = ""; // Clear for next selection
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (!emojiRef.current?.contains(e.target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white border-t">
      <div className="flex items-center gap-1 px-2 border-b py-1 ">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 text-gray-500 cursor-pointer"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <Smile className="w-10 h-10" />
        </Button>

        {showEmoji && (
          <div ref={emojiRef} className="absolute bottom-16 left-2 z-50">
            <EmojiPicker
              onEmojiClick={handleSelectEmoji}
              previewConfig={{ showPreview: false }}
              width={300}
              height={400}
            />
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          multiple
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="ghost"
          className="w-10 h-10 text-gray-500 cursor-pointer"
          title="Đính kèm file"
        >
          <Paperclip className="w-10 h-10" />
        </Button>

        <input
          type="file"
          ref={imageInputRef}
          onChange={onFileChange}
          multiple
          accept="image/*"
          className="hidden"
        />
        <Button
          onClick={() => imageInputRef.current?.click()}
          variant="ghost"
          className="w-10 h-10 text-gray-500 cursor-pointer"
          title="Gửi hình ảnh"
        >
          <ImageIcon className="w-10 h-10" />
        </Button>
        <div className="flex-1"></div>
      </div>
      <div className="flex items-center gap-2 p-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`Nhắn tin tới ${chatName}`}
          rows={1}
          className="
            flex-1 
            resize-none 
            border-none 
            bg-white 
            text-sm 
            outline-none 
            overflow-y-auto
            p-2
            leading-6
            max-h-60
          "
        />
        <Button
          onClick={handleSend}
          variant="ghost"
          size="icon"
          className="w-10 h-10 text-[#0068ff] hover:text-[#005AE0] cursor-pointer"
        >
          <span className="font-bold text-sm ">
            {text.trim().length > 0 ? <SendHorizontal /> : "GỬI"}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
