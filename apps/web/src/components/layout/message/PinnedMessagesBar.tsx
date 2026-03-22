import { useState } from "react";
import type { MessagesType } from "@/types/messages.type";
import { BiMessageRoundedDetail } from "react-icons/bi";
import { RiUnpinLine } from "react-icons/ri";

type Props = {
  pinnedMessages: MessagesType[];
  handlePinnedMessage: (messageId: string) => void;
  onClickMessage: (messageId: string) => void;
};

const PinnedMessagesBar = ({
  pinnedMessages,
  handlePinnedMessage,
  onClickMessage,
}: Props) => {
  const [openList, setOpenList] = useState(false);

  if (!pinnedMessages.length) return null;

  const first = pinnedMessages[0];
  const remaining = pinnedMessages.length - 1;

  const renderContent = (msg: MessagesType) => {
    if (msg.content.text) return msg.content.text;
    if (msg.content.file) return msg.content.file.fileName;
    return "Tin nhắn";
  };

  return (
    <div className="relative z-50">
      {/* 🔹 HEADER */}
      <div
        className={`bg-white border mx-3 mt-2 rounded-lg px-3 py-2 flex items-center justify-between transition-all duration-200
        ${openList ? "shadow-md ring-1 ring-gray-200" : "shadow-sm hover:shadow-md"}
      `}
      >
        <div
          className="flex-1 cursor-pointer flex items-center gap-3"
          onClick={() => {
            onClickMessage(first._id);
            setOpenList(false);
          }}
        >
          <div className="bg-blue-100 p-2 rounded-full">
            <BiMessageRoundedDetail className="w-5 h-5 text-[#689DED]" />
          </div>

          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-gray-500">
              Tin nhắn ghim
            </div>
            <div className="text-[13px] text-gray-800 truncate">
              <span className="font-medium">
                {first.senderId?.profile?.name}
              </span>
              : {renderContent(first)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {remaining > 0 && (
            <button
              onClick={() => setOpenList((prev) => !prev)}
              className={`text-xs px-2 py-1 rounded-md border  cursor-pointer
                ${
                  openList
                    ? "bg-gray-100 border-gray-300"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
            >
              +{remaining} ghim
            </button>
          )}

          <button
            onClick={() => handlePinnedMessage(first._id)}
            className="p-1 hover:bg-red-50 rounded-md cursor-pointer"
            title="Bỏ ghim"
          >
            <RiUnpinLine className="text-red-400 w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🔹 OVERLAY */}
      {openList && (
        <div
          onClick={() => setOpenList(false)}
          className="fixed inset-0 bg-black/20 z-40"
        />
      )}

      {/* 🔹 LIST */}
      <div
        className={`absolute left-0 right-0 mt-2 z-50 transition-all duration-200 origin-top
        ${
          openList
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-95 pointer-events-none"
        }`}
      >
        <div className="bg-white shadow-lg rounded-lg mx-3 overflow-hidden">
          {pinnedMessages.map((msg) => (
            <div
              key={msg._id}
              className="flex items-center justify-between px-4 py-3 border-b hover:bg-gray-50"
            >
              <div
                onClick={() => {
                  onClickMessage(msg._id);
                  setOpenList(false);
                }}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                <div className="bg-blue-100 p-2 rounded-full">
                  <BiMessageRoundedDetail className="w-5 h-5 text-[#689DED]" />
                </div>

                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">Tin nhắn</div>
                  <div className="text-[13px] text-gray-700 truncate">
                    <span className="font-medium">
                      {msg.senderId?.profile?.name}
                    </span>
                    : {renderContent(msg)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handlePinnedMessage(msg._id)}
                className="ml-3 p-2 rounded hover:bg-red-50 cursor-pointer"
                title="Bỏ ghim"
              >
                <RiUnpinLine className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PinnedMessagesBar;
