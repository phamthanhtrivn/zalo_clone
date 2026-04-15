import {
  Smile,
  Paperclip,
  Image as ImageIcon,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { RiShareForward2Fill } from "react-icons/ri";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearReplyingMessage } from "@/store/slices/conversationSlice";
import { X, Quote } from "lucide-react";

type Props = {
  chatName: string;
  onSendMessage: (text: string) => void;
  onSendFiles: (files: FileList) => void;
  isSelected: boolean;
  setIsSelected: (isSelected: boolean) => void;
  selectedMessages: string[];
  setSelectedMessages: (messageIds: string[]) => void;
  onOpenForwardModal: () => void;
};

const ChatInput = ({
  chatName,
  onSendMessage,
  onSendFiles,
  isSelected,
  setIsSelected,
  selectedMessages,
  setSelectedMessages,
  onOpenForwardModal,
}: Props) => {
  const dispatch = useAppDispatch();
  const replyingMessage = useAppSelector(
    (state) => state.conversation.replyingMessage,
  );
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
      if (replyingMessage) {
        dispatch(clearReplyingMessage());
      }
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
      {isSelected && (
        <div className="px-3 py-2 border-b flex justify-between items-center bg-white">
          <div className="text-sm">
            <span className="px-2 py-1 bg-[#E5F1FF] rounded font-medium text-[#104EAD] mr-1">
              {selectedMessages.length}
            </span>{" "}
            Đã chọn
          </div>

          <div className="flex gap-2">
            <button
              onClick={onOpenForwardModal}
              className="bg-blue-500 text-white px-4 py-2 rounded-full cursor-pointer hover:bg-blue-600 transition flex justify-between items-center gap-1 text-sm"
            >
              <RiShareForward2Fill />
              Chuyển tiếp
            </button>

            <button
              onClick={() => {
                setIsSelected(false);
                setSelectedMessages([]);
              }}
              className="text-gray-500 cursor-pointer px-4 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition text-sm "
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {replyingMessage && (
        <div className="px-4 py-2 border-b flex items-stretch gap-3 bg-gray-50/80 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 bg-[#0068ff] rounded-full" />
          <div className="flex-1 min-w-0 py-1">
            <div className="text-[13px] font-semibold text-[#0068ff] mb-0.5 flex items-center gap-1.5">
              <Quote size={12} className="fill-current" />
              Trả lời {replyingMessage.senderId.profile?.name}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {replyingMessage.content?.text ||
                (replyingMessage.content?.file ? replyingMessage.content.file.fileName : "")}
            </p>
          </div>
          <button
            onClick={() => dispatch(clearReplyingMessage())}
            className="p-1 hover:bg-gray-200 rounded-full h-fit self-center transition-colors cursor-pointer"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      )}

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
