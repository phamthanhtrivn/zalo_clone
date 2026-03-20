import type { ConversationCategory, ConversationItemType } from "@/types/conversation-item.type";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/utils/format-message-time..util";
import { MoreHorizontal } from "lucide-react";
import { MdGroups, MdNotificationsOff } from "react-icons/md";
import React, { useMemo, useState } from "react";
import { ConversationType } from "@zalo-clone/shared-types";
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { pinConversation, unpinConversation, hideConversation, unhideConversation, muteConversation, unmuteConversation } from "@/services/conversation-settings.service";
import { useAppDispatch } from "@/store";
import { togglePinConversation, hideConversationLocal, toggleMuteConversation } from "@/store/slices/conversationSlice";
import { PiPushPinFill } from "react-icons/pi";
import { IoNotificationsOff } from "react-icons/io5";
import { setCategoryLocal } from "@/store/slices/conversationSlice";
import { setCategory } from "@/services/conversation-settings.service";
import { IoCheckmark } from "react-icons/io5";
const CURRENT_USER_ID = "699d2b94f9075fe800282901";
type Props = {
  conversation: ConversationItemType;
  isActive: boolean;
  openMenu: string | null
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>
};
const CATEGORY_STYLE = {
  customer: "bg-red-500 before:bg-red-500",
  family: "bg-green-500 before:bg-green-500",
  work: "bg-orange-500 before:bg-orange-500",
  friends: "bg-purple-500 before:bg-purple-500",
  later: "bg-yellow-500 before:bg-yellow-500",
  colleague: "bg-blue-500 before:bg-blue-500",
};
const ConversationListItem = ({ conversation, isActive, openMenu, setOpenMenu }: Props) => {
  const getPreviewContent = useMemo(() => {
    const content = conversation.lastMessage?.content;

    if (!content) return "";
    if (content.text) return content.text;
    if (content.icon) return "[Sticker]";
    if (content.file) return content.file.fileKey;

    return "";
  }, [conversation.lastMessage]);
  const dispatch = useAppDispatch();
  const isDirect = conversation.type === ConversationType.DIRECT
  const [hoverMenu, setHoverMenu] = useState<string | null>(null)

  const closeSubMenu = () => setHoverMenu(null)

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })

  const {
    refs: subRefs,
    floatingStyles: subFloatingStyles
  } = useFloating({
    placement: "right-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })
  const handlePinConversation = async () => {
    setOpenMenu(null);

    if (conversation.pinned) {
      await unpinConversation(CURRENT_USER_ID, conversation.conversationId)
    } else {
      await pinConversation(CURRENT_USER_ID, conversation.conversationId)
    }

    dispatch(togglePinConversation(conversation.conversationId));
  };
  const handleHideConversation = async () => {
    try {
      setOpenMenu(null);

      if (conversation.hidden) {
        await unhideConversation(CURRENT_USER_ID, conversation.conversationId);
      } else {
        await hideConversation(CURRENT_USER_ID, conversation.conversationId);
      }

      dispatch(hideConversationLocal(conversation.conversationId));
    } catch (error) {
      console.error("Hide failed:", error);
    }
  };
  const handleMute = async (duration: number) => {
    try {
      setOpenMenu(null);

      if (duration === 0) {
        await unmuteConversation(CURRENT_USER_ID, conversation.conversationId);
      } else {
        await muteConversation(
          CURRENT_USER_ID,
          conversation.conversationId,
          duration
        );
      }

      dispatch(toggleMuteConversation(conversation.conversationId));
    } catch (error) {
      console.error("Mute failed:", error);
    }
  };
  const handleCategory = async (category: ConversationCategory) => {
    try {
      setOpenMenu(null);

      const newCategory =
        conversation.category === category ? null : category;

      await setCategory(
        CURRENT_USER_ID,
        conversation.conversationId,
        newCategory as any
      );

      dispatch(
        setCategoryLocal({
          conversationId: conversation.conversationId,
          category: newCategory,
        })
      );

    } catch (error) {
      console.error("Set category failed:", error);
    }
  };
  return (
    <Link
      to={`/conversation/${conversation.conversationId}`}
      state={{
        conversation,
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group mt-2 mx-2 rounded-lg",
        isActive ? "bg-[#e5efff]" : "hover:bg-[#f3f5f6]",
      )}
    >
      <Avatar className="w-12 h-12">
        <AvatarImage src={conversation.avatar} alt={conversation.name} />
        <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4
            className={cn(
              "text-sm font-medium truncate flex gap-2 items-center",
              isActive ? "text-black" : "text-gray-900",
            )}
          >
            {conversation.type === "GROUP" && (
              <MdGroups size={18} color="gray" />
            )}


            {conversation.name}

            {conversation.pinned && (
              <PiPushPinFill className="text-blue-500 w-3 h-3 ml-1" />
            )}
          </h4>

          <div className="relative flex items-center">
            {conversation.muted && (

              <MdNotificationsOff className="text-gray-400 w-5 h-5" />
            )}
            {/* time */}
            <span className="text-[11px] text-gray-400 transition-opacity group-hover:opacity-0">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>

            {/* button */}
            <div ref={refs.setReference}>
              <MoreHorizontal
                className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpenMenu(openMenu === conversation.conversationId ? null : conversation.conversationId)
                }}
              />
              {openMenu === conversation.conversationId && (
                <FloatingPortal>
                  <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 w-56 bg-white rounded-xl shadow-lg border text-sm"
                  >

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={handlePinConversation}
                    >
                      {conversation.pinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
                    </div>

                    {/* CATEGORY */}
                    <div
                      ref={subRefs.setReference}
                      onMouseEnter={() => setHoverMenu("category")}
                      className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
                    >
                      Phân loại <span>›</span>

                      {hoverMenu === "category" && (
                        <div
                          ref={subRefs.setFloating}
                          style={subFloatingStyles}
                          onMouseEnter={() => setHoverMenu("category")}
                          onMouseLeave={closeSubMenu}
                          className="w-56 bg-white rounded-xl shadow-lg border text-sm"
                        >
                          <div
                            onClick={() => handleCategory('customer')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                              Khách hàng
                            </div>
                            {conversation.category === "customer" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div
                            onClick={() => handleCategory('family')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                              Gia đình
                            </div>
                            {conversation.category === "family" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div
                            onClick={() => handleCategory('work')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
                              Công việc
                            </div>
                            {conversation.category === "work" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div
                            onClick={() => handleCategory('friends')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
                              Bạn bè
                            </div>
                            {conversation.category === "friends" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div
                            onClick={() => handleCategory('later')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span>
                              Trả lời sau
                            </div>
                            {conversation.category === "later" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div
                            onClick={() => handleCategory('colleague')}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                              Đồng nghiệp
                            </div>
                            {conversation.category === "colleague" && (
                              <IoCheckmark className="text-blue-500 w-4 h-4" />
                            )}
                          </div>

                          <div className="border-t"></div>

                          <div className="p-3 hover:bg-gray-100 cursor-pointer">
                            Quản lý thẻ phân loại
                          </div> </div>
                      )}
                    </div>

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                    >
                      Đánh dấu chưa đọc
                    </div>

                    <div className="border-t my-1"></div>

                    {isDirect && (
                      <div
                        onMouseEnter={closeSubMenu}
                        className="p-3 hover:bg-gray-100 cursor-pointer"
                      >
                        Thêm vào nhóm
                      </div>
                    )}

                    {/* MUTE */}
                    {!conversation.muted && (
                      <div
                        onMouseEnter={() => setHoverMenu("mute")}
                        className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
                      >
                        Tắt thông báo <span>›</span>

                        {hoverMenu === "mute" && (
                          <div
                            onMouseEnter={() => setHoverMenu("mute")}
                            onMouseLeave={closeSubMenu}
                            className="absolute left-full ml-1 top-0 w-48 bg-white rounded-xl shadow-lg border"
                          >
                            <div
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleMute(60)}
                            >
                              Trong 1 giờ
                            </div>

                            <div
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleMute(240)}
                            >
                              Trong 4 giờ
                            </div>

                            <div
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleMute(-2)}
                            >
                              Cho đến 8:00 AM
                            </div>

                            <div
                              className="p-3 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleMute(-1)}
                            >
                              Cho đến khi mở lại
                            </div>
                          </div>
                        )}
                      </div>)}
                    {conversation.muted && (
                      <div
                        className="p-3 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleMute(0)}
                      >
                        Bật lại thông báo
                      </div>
                    )}

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={handleHideConversation}
                    >
                      {conversation.hidden ? "Bỏ ẩn trò chuyện" : "Ẩn trò chuyện"}
                    </div>

                    {/* DELETE TIMER */}
                    <div
                      onMouseEnter={() => setHoverMenu("delete")}
                      className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
                    >
                      Tin nhắn tự xóa <span>›</span>

                      {hoverMenu === "delete" && (
                        <div
                          onMouseEnter={() => setHoverMenu("delete")}
                          onMouseLeave={closeSubMenu}
                          className="absolute left-full ml-1 top-0 w-44 bg-white rounded-xl shadow-lg border"
                        >
                          <div className="p-3 hover:bg-gray-100 cursor-pointer">1 ngày</div>
                          <div className="p-3 hover:bg-gray-100 cursor-pointer">7 ngày</div>
                          <div className="p-3 hover:bg-gray-100 cursor-pointer">14 ngày</div>
                          <div className="border-t"></div>
                          <div className="p-3 hover:bg-gray-100 cursor-pointer">Không bao giờ</div>
                        </div>
                      )}
                    </div>

                    <div className="border-t my-1"></div>

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 text-red-500 hover:bg-gray-100 cursor-pointer"
                    >
                      Xóa hội thoại
                    </div>

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                    >
                      Báo xấu
                    </div>

                  </div>
                </FloatingPortal>
              )}
            </div>
          </div>
        </div>

        <p className="text-[13px] text-gray-500 truncate flex items-center gap-2">
          {/* 👉 TAG */}
          {conversation.category && (
            <span
              className={cn(
                "relative inline-flex items-center px-2 py-[2px] text-[10px] font-medium text-white rounded-l-md",
                "before:absolute before:right-[-6px] before:top-0 before:h-full before:w-3 before:skew-x-[-30deg]",
                CATEGORY_STYLE[conversation.category]
              )}
            >
              {conversation.category === "customer" && "KH"}
              {conversation.category === "family" && "GĐ"}
              {conversation.category === "work" && "CV"}
              {conversation.category === "friends" && "BB"}
              {conversation.category === "later" && "Sau"}
              {conversation.category === "colleague" && "ĐN"}
            </span>
          )}

          {/* 👉 TEXT */}
          <span className="truncate">
            {conversation.type === "PRIVATE" &&
              conversation.lastMessage?.senderName !== "Bạn"
              ? ""
              : conversation.lastMessage?.senderName + ": "}
            {getPreviewContent}
          </span>
        </p>
      </div>
    </Link>
  );
};

export default React.memo(ConversationListItem);
