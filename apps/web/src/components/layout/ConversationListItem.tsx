import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/utils/format-message-time..util";
import { MoreHorizontal } from "lucide-react";
import { MdGroups, MdNotificationsOff } from "react-icons/md";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import {
  pinConversation,
  unpinConversation,
  hideConversation,
  unhideConversation,
  muteConversation,
  unmuteConversation,
  setCategory,
  deleteConversation,
  expireMessage,
} from "@/services/conversation-settings.service";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  updateConversationSetting,
  setCategoryLocal,
  removeConversation,
} from "@/store/slices/conversationSlice";
import { PiPushPinFill } from "react-icons/pi";
import { IoCheckmark } from "react-icons/io5";
import { CiImageOn } from "react-icons/ci";
import { RiVideoLine } from "react-icons/ri";
import { LuSticker } from "react-icons/lu";
import { HiMiniLink } from "react-icons/hi2";
import { GoFileSymlinkFile } from "react-icons/go";
import type {
  ConversationCategory,
  ConversationItemType,
} from "@/types/conversation-item.type";

type Props = {
  conversation: ConversationItemType;
  isActive: boolean;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
};

const CATEGORY_STYLE = {
  customer: "bg-red-500 before:bg-red-500",
  family: "bg-green-500 before:bg-green-500",
  work: "bg-orange-500 before:bg-orange-500",
  friends: "bg-purple-500 before:bg-purple-500",
  later: "bg-yellow-500 before:bg-yellow-500",
  colleague: "bg-blue-500 before:bg-blue-500",
};

const ConversationListItem = ({
  conversation,
  isActive,
  openMenu,
  setOpenMenu,
}: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);

  const closeSubMenu = () => setHoverMenu(null);

  // Floating UI cho Menu chính và SubMenu
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const { refs: subRefs, floatingStyles: subFloatingStyles } = useFloating({
    placement: "right-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Logic render nội dung xem trước của tin nhắn cuối
  const previewContent = useMemo(() => {
    const content = conversation.lastMessage?.content;
    const recalled = conversation.lastMessage?.recalled;
    if (recalled) return "Tin nhắn đã được thu hồi";
    if (!content) return "";

    let icon = null;
    let text = "";

    if (content.text && /https?:\/\//.test(content.text)) {
      icon = <HiMiniLink className="inline mr-1" />;
      text = content.text;
    } else if (content.icon) {
      icon = <LuSticker className="inline mr-1" />;
      text = "Sticker";
    } else if (content.file) {
      switch (content.file.type) {
        case "IMAGE":
          icon = <CiImageOn className="inline mr-1" />;
          text = "Hình ảnh";
          break;
        case "VIDEO":
          icon = <RiVideoLine className="inline mr-1" />;
          text = "Video";
          break;
        case "FILE":
          icon = <GoFileSymlinkFile className="inline mr-1" />;
          text = content.file.fileName;
          break;
      }
    } else if (content.text) {
      text = content.text;
    }

    return (
      <div className="flex items-center gap-1 truncate">
        {icon}
        <span className="truncate">{text}</span>
      </div>
    );
  }, [conversation.lastMessage]);

  // --- HANDLERS ---
  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !conversation.pinned;
    setOpenMenu(null);
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        pinned: newPinned,
      }),
    );
    try {
      newPinned
        ? await pinConversation(user?.userId, conversation.conversationId)
        : await unpinConversation(user?.userId, conversation.conversationId);
    } catch {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          pinned: !newPinned,
        }),
      );
    }
  };

  const handleMute = async (duration: number) => {
    const newMuted = duration !== 0;
    setOpenMenu(null);
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        muted: newMuted,
      }),
    );
    try {
      duration === 0
        ? await unmuteConversation(user?.userId, conversation.conversationId)
        : await muteConversation(
            user?.userId,
            conversation.conversationId,
            duration,
          );
    } catch {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          muted: !newMuted,
        }),
      );
    }
  };

  const handleDelete = async () => {
    setOpenMenu(null);
    try {
      await deleteConversation(user?.userId, conversation.conversationId);
      dispatch(removeConversation(conversation.conversationId));
    } catch (err) {
      console.error(err);
    }
  };

  const expireDays = conversation.expireDuration
    ? conversation.expireDuration / (24 * 60 * 60 * 1000)
    : 0;

  return (
    <div
      onClick={() => navigate(`/conversations/${conversation.conversationId}`)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group mt-2 mx-2 rounded-lg relative",
        isActive ? "bg-[#e5efff]" : "hover:bg-[#f3f5f6]",
      )}
    >
      <Avatar className="w-12 h-12 shrink-0">
        <AvatarImage src={conversation.avatar} alt={conversation.name} />
        <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4
            className={cn(
              "text-sm font-medium truncate flex gap-1.5 items-center",
              isActive ? "text-black" : "text-gray-900",
            )}
          >
            {conversation.type === "GROUP" && (
              <MdGroups size={18} className="text-gray-400" />
            )}
            {conversation.name}
            {conversation.pinned && (
              <PiPushPinFill className="text-blue-500 w-3 h-3" />
            )}
          </h4>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 group-hover:hidden">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>

            <div ref={refs.setReference}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMenu(
                    openMenu === conversation.conversationId
                      ? null
                      : conversation.conversationId,
                  );
                }}
                className="p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Dòng tin nhắn cuối và Badge số lượng */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] text-gray-500 truncate flex items-center gap-2 flex-1">
            {/* Thẻ phân loại màu sắc */}
            {conversation.category && (
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-[1px] text-[9px] font-bold text-white rounded",
                  CATEGORY_STYLE[conversation.category],
                )}
              >
                {conversation.category.substring(0, 2).toUpperCase()}
              </span>
            )}
            {/* Tên người gửi (nếu là nhóm) */}
            {conversation.type === "GROUP" &&
              conversation.lastMessage?.senderName &&
              conversation.lastMessage.senderName !== "Bạn" && (
                <span className="shrink-0">
                  {conversation.lastMessage.senderName}:
                </span>
              )}
            <div className="truncate">{previewContent}</div>
          </div>

          {/* Badge tin nhắn chưa đọc */}
          {(conversation.unreadCount ?? 0) > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Menu Floating Portal */}
      {openMenu === conversation.conversationId && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 w-56 bg-white rounded-xl shadow-2xl border py-1 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-3 hover:bg-gray-100 cursor-pointer"
              onClick={handlePin}
            >
              {conversation.pinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
            </div>

            {/* Thêm các mục khác như Tắt thông báo, Xóa... tương tự logic em đã gửi */}
            <div
              className="p-3 text-red-500 hover:bg-red-50 cursor-pointer border-t"
              onClick={handleDelete}
            >
              Xóa lịch sử trò chuyện
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export default React.memo(ConversationListItem);
