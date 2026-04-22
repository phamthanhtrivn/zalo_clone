import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  setUnreadCount,
} from "@/store/slices/conversationSlice";
import { PiPushPinFill } from "react-icons/pi";
import { IoCheckmark } from "react-icons/io5";
import { CiImageOn } from "react-icons/ci";
import { RiVideoLine } from "react-icons/ri";
import { LuSticker } from "react-icons/lu";
import { HiMiniLink } from "react-icons/hi2";
import { GoFileSymlinkFile } from "react-icons/go";
import { useSocket } from "@/contexts/SocketContext";
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
const getIsExpired = (expired?: boolean, expiresAt?: string | null) => {
  if (expired) return true;
  if (!expiresAt) return false;

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return Boolean(expired);

  return expiresAtMs <= Date.now();
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
  const [isLastMessageExpired, setIsLastMessageExpired] = useState(() =>
    getIsExpired(conversation.lastMessage?.expired, conversation.lastMessage?.expiresAt),
  );
  const { socket } = useSocket();

  const closeSubMenu = () => setHoverMenu(null);
  const isDirect = conversation.type === "DIRECT";

  const { markAsRead, markAsUnread } = useSocket(); // ✅ Lấy từ context
  const handleConversationClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Chuyển hướng đến conversation
    navigate(`/conversation/${conversation.conversationId}`);

    // ✅ Nếu có tin nhắn chưa đọc, đánh dấu đã đọc
    if (conversation.unreadCount > 0 && user?.userId && socket) {
      console.log(`📖 Marking conversation ${conversation.conversationId} as read`);

      // Optimistic update
      dispatch(
        setUnreadCount({
          conversationId: conversation.conversationId,
          unreadCount: 0,
        })
      );

      try {
        await markAsRead({
          userId: user.userId,
          conversationId: conversation.conversationId,
        });
      } catch (error) {
        console.error("Failed to mark as read:", error);
        // Rollback nếu có lỗi
        dispatch(
          setUnreadCount({
            conversationId: conversation.conversationId,
            unreadCount: conversation.unreadCount,
          })
        );
      }
    }
  }, [conversation, user, socket, markAsRead, dispatch, navigate]);
  const handleMarkUnread = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(null);

    if (!user?.userId) return;

    const prevUnreadCount = conversation.unreadCount;
    const isCurrentlyUnread = prevUnreadCount > 0;

    // ✅ Optimistic update
    dispatch(
      setUnreadCount({
        conversationId: conversation.conversationId,
        unreadCount: isCurrentlyUnread ? 0 : 1,
      })
    );

    try {
      if (isCurrentlyUnread) {
        console.log("📖 Marking as read...");
        await markAsRead({
          userId: user.userId,
          conversationId: conversation.conversationId,
        });
      } else {
        console.log("📝 Marking as unread...");
        await markAsUnread({
          userId: user.userId,
          conversationId: conversation.conversationId,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      dispatch(
        setUnreadCount({
          conversationId: conversation.conversationId,
          unreadCount: prevUnreadCount,
        })
      );
    }
  };

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

  useEffect(() => {
    const lastMessage = conversation.lastMessage;

    if (lastMessage?.expired) {
      setIsLastMessageExpired(true);
      return;
    }

    if (!lastMessage?.expiresAt) {
      setIsLastMessageExpired(false);
      return;
    }

    const expiresAtMs = new Date(lastMessage.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      setIsLastMessageExpired(Boolean(lastMessage.expired));
      return;
    }

    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      setIsLastMessageExpired(true);
      return;
    }

    setIsLastMessageExpired(false);
    const timeoutId = window.setTimeout(
      () => setIsLastMessageExpired(true),
      remainingMs + 50,
    );

    return () => window.clearTimeout(timeoutId);
  }, [conversation.lastMessage]);

  const getPreviewContent = useMemo(() => {
    const lastMsg = conversation.lastMessage;
    if (!lastMsg) return "";
    if (lastMsg.recalled) return "Tin nhắn đã bị thu hồi";
    if (isLastMessageExpired) return "Tin nhắn đã hết hạn";
    const content = lastMsg.content;
    if (!content) return "";

    let icon = null;
    let text = "";

    if (content.text && /https?:\/\//.test(content.text)) {
      icon = <HiMiniLink />;
      text = content.text;
    } else if (content.icon) {
      icon = <LuSticker />;
      text = "Sticker";
    } else if (Array.isArray(content.files) && content.files.length > 0) {
      switch (content.files[content.files.length - 1].type) {
        case "IMAGE":
          icon = <CiImageOn />;
          text = "Hình ảnh";
          break;
        case "VIDEO":
          icon = <RiVideoLine />;
          text = "Video";
          break;
        case "FILE":
          icon = <GoFileSymlinkFile />;
          text = content.files[0].fileName;
          break;
        default:
          text = "";
      }
    } else if (content.text) {
      text = content.text;
    }

    return (
      <span className="flex items-center gap-1 truncate">
        {icon}
        <span className="truncate">{text}</span>
      </span>
    );
  }, [conversation.lastMessage, isLastMessageExpired]);

  const handlePinConversation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(null);
    const newPinned = !conversation.pinned;

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
    } catch (error) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          pinned: !newPinned,
        }),
      );
      console.error("Pin failed:", error);
    }
  };

  const handleHideConversation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(null);
    const newHidden = !conversation.hidden;

    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        hidden: newHidden,
      }),
    );

    try {
      newHidden
        ? await hideConversation(user?.userId, conversation.conversationId)
        : await unhideConversation(user?.userId, conversation.conversationId);
    } catch (error) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          hidden: !newHidden,
        }),
      );
      console.error("Hide failed:", error);
    }
  };

  const handleMute = async (duration: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpenMenu(null);
    const newMuted = duration !== 0;
    const prevMuted = conversation.muted;

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
    } catch (error) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          muted: prevMuted,
        }),
      );
      console.error("Mute failed:", error);
    }
  };

  const handleCategory = async (
    category: ConversationCategory,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(null);
    const newCategory = conversation.category === category ? null : category;

    dispatch(
      setCategoryLocal({
        conversationId: conversation.conversationId,
        category: newCategory,
      }),
    );

    try {
      await setCategory(
        user?.userId,
        conversation.conversationId,
        newCategory as any,
      );
    } catch (error) {
      dispatch(
        setCategoryLocal({
          conversationId: conversation.conversationId,
          category: conversation.category ?? null,
        }),
      );
      console.error("Set category failed:", error);
    }
  };
  useEffect(() => {
    const lastMessage = conversation.lastMessage;

    if (lastMessage?.expired) {
      setIsLastMessageExpired(true);
      return;
    }

    if (!lastMessage?.expiresAt) {
      setIsLastMessageExpired(false);
      return;
    }

    const expiresAtMs = new Date(lastMessage.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      setIsLastMessageExpired(Boolean(lastMessage.expired));
      return;
    }

    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      setIsLastMessageExpired(true);
      return;
    }

    setIsLastMessageExpired(false);
    const timeoutId = window.setTimeout(
      () => setIsLastMessageExpired(true),
      remainingMs + 50,
    );

    return () => window.clearTimeout(timeoutId);
  }, [conversation.lastMessage]);
  const handleDeleteConversation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await deleteConversation(user?.userId, conversation.conversationId);
      dispatch(removeConversation(conversation.conversationId));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleExpire = async (days: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpenMenu(null);
    const duration = days === 0 ? 0 : days * 24 * 60 * 60 * 1000;
    const prevDuration = conversation.expireDuration;

    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        expireDuration: duration,
      }),
    );

    try {
      await expireMessage(user?.userId, conversation.conversationId, duration);
    } catch (error) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          expireDuration: prevDuration,
        }),
      );
      console.error("Set expire failed:", error);
    }
  };

  const expireDays = conversation.expireDuration
    ? conversation.expireDuration / (24 * 60 * 60 * 1000)
    : 0;

  return (
    <div
      onClick={handleConversationClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group mt-2 mx-2 rounded-lg",
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
              "text-sm truncate flex gap-2 items-center",
              conversation.unreadCount > 0
                ? "font-semibold text-black"
                : "font-normal text-gray-900",
              isActive ? "text-black" : "",
            )}
          >
            {conversation.type === "GROUP" && (
              <MdGroups size={18} color="gray" />
            )}
            <span className="flex items-center gap-2">{conversation.name}</span>
            {conversation.pinned && (
              <PiPushPinFill className="text-blue-500 w-3 h-3 ml-1" />
            )}
          </h4>

          <div className="relative flex items-center">
            {conversation.muted && (
              <MdNotificationsOff className="text-gray-400 w-5 h-5 mr-1" />
            )}

            <div className="flex flex-col items-end">
              <span className="text-[11px] text-gray-400 transition-opacity group-hover:opacity-0">
                {formatMessageTime(conversation.lastMessageAt)}
              </span>

              {conversation.unreadCount > 0 && (
                <span span className="mt-1 bg-red-500 text-white text-[10px] px-2 py-[1px] rounded-full">
                  {conversation.unreadCount > 99
                    ? "99+"
                    : conversation.unreadCount}
                </span>
              )}
            </div>

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
                className="absolute top-1/2 right-0 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent"
              >
                <MoreHorizontal size={16} className="text-gray-500" />
              </button>

              {openMenu === conversation.conversationId && (
                <FloatingPortal>
                  <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 w-56 bg-white rounded-xl shadow-lg border text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={handlePinConversation}
                    >
                      {conversation.pinned
                        ? "Bỏ ghim hội thoại"
                        : "Ghim hội thoại"}
                    </div>

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
                          {(
                            [
                              "customer",
                              "family",
                              "work",
                              "friends",
                              "later",
                              "colleague",
                            ] as ConversationCategory[]
                          ).map((cat) => {
                            const colorMap: Record<
                              ConversationCategory,
                              string
                            > = {
                              customer: "bg-red-500",
                              family: "bg-green-500",
                              work: "bg-orange-500",
                              friends: "bg-purple-500",
                              later: "bg-yellow-500",
                              colleague: "bg-blue-500",
                            };
                            const labelMap: Record<
                              ConversationCategory,
                              string
                            > = {
                              customer: "Khách hàng",
                              family: "Gia đình",
                              work: "Công việc",
                              friends: "Bạn bè",
                              later: "Trả lời sau",
                              colleague: "Đồng nghiệp",
                            };
                            return (
                              <div
                                key={cat}
                                onClick={(e) => handleCategory(cat, e)}
                                className="p-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-3 h-3 rounded-sm",
                                      colorMap[cat],
                                    )}
                                  ></span>
                                  {labelMap[cat]}
                                </div>
                                {conversation.category === cat && (
                                  <IoCheckmark className="text-blue-500 w-4 h-4" />
                                )}
                              </div>
                            );
                          })}

                          <div className="border-t"></div>
                          <div className="p-3 hover:bg-gray-100 cursor-pointer">
                            Quản lý thẻ phân loại
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={handleMarkUnread}
                    >
                      {conversation.unreadCount > 0
                        ? "Đánh dấu đã đọc"
                        : "Đánh dấu chưa đọc"}
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
                    {!conversation.muted ? (
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
                            {[
                              { label: "Trong 1 giờ", duration: 60 },
                              { label: "Trong 4 giờ", duration: 240 },
                              { label: "Cho đến 8:00 AM", duration: -2 },
                              { label: "Cho đến khi mở lại", duration: -1 },
                            ].map((opt) => (
                              <div
                                key={opt.label}
                                className="p-3 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => handleMute(opt.duration, e)}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onMouseEnter={closeSubMenu}
                        className="p-3 hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => handleMute(0, e)}
                      >
                        Bật lại thông báo
                      </div>
                    )}

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={handleHideConversation}
                    >
                      {conversation.hidden
                        ? "Bỏ ẩn trò chuyện"
                        : "Ẩn trò chuyện"}
                    </div>

                    {/* DELETE TIMER */}
                    <div
                      onMouseEnter={() => setHoverMenu("delete")}
                      className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
                    >
                      Tin nhắn tự xóa <span>›</span>
                      {hoverMenu === "delete" && (
                        <div className="absolute left-full ml-1 top-0 w-44 bg-white rounded-xl shadow-lg border">
                          {[
                            { label: "1 ngày", days: 1 },
                            { label: "7 ngày", days: 7 },
                            { label: "Không bao giờ", days: 0 },
                          ].map((opt) => (
                            <div
                              key={opt.label}
                              className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between"
                              onClick={(e) => handleExpire(opt.days, e)}
                            >
                              {opt.label}
                              {expireDays === opt.days && (
                                <IoCheckmark className="text-blue-500 w-4 h-4" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t my-1"></div>

                    <div
                      onMouseEnter={closeSubMenu}
                      className="p-3 text-red-500 hover:bg-gray-100 cursor-pointer"
                      onClick={handleDeleteConversation}
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

        {/* Dòng hiển thị Tin nhắn cuối cùng và Thẻ tag */}
        <p className="text-[13px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
          {conversation.category && (
            <span
              className={cn(
                "relative inline-flex items-center px-2 py-[2px] text-[10px] font-medium text-white rounded-l-md",
                "before:absolute before:right-[-6px] before:top-0 before:h-full before:w-3 before:skew-x-[-30deg]",
                CATEGORY_STYLE[conversation.category],
              )}
            >
              {
                {
                  customer: "KH",
                  family: "GĐ",
                  work: "CV",
                  friends: "BB",
                  later: "Sau",
                  colleague: "ĐN",
                }[conversation.category]
              }
            </span>
          )}
          <span className="text-[13px] text-gray-500 flex items-center gap-1 truncate">
            {/* sender */}
            <span className="shrink-0">
              {conversation.type === "PRIVATE" &&
                conversation.lastMessage?.senderName !== "Bạn"
                ? ""
                : `${conversation.lastMessage?.senderName ?? ""}: `}
            </span>

            {/* message content */}
            <span
              className={cn(
                "flex items-center gap-1 truncate",
                conversation.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-500"
              )}
            >
              {getPreviewContent}
            </span>
          </span>
        </p>
      </div>
    </div >
  );
};

export default React.memo(ConversationListItem);
