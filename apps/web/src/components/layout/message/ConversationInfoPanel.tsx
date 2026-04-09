import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  MoreHorizontal,
  UserPlus,
  Pin,
  PinOff,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Users,
  Link2,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Download,
  ChevronLeft,
} from "lucide-react";
import { messageService } from "@/services/message.service";
import { conversationService } from "@/services/conversation.service";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { getFileIcon } from "@/utils/file-icon.util";
import { getDateLabel } from "@/utils/format-message-time..util";
import { saveAs } from "file-saver";
import CreateGroupModal from "@/components/layout/CreateGroupModal";
import { useAppDispatch, useAppSelector } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { setConversations } from "@/store/slices/conversationSlice";

type ConversationMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

function memberRoleLabel(role: ConversationMemberRow["role"]): string {
  switch (role) {
    case "OWNER":
      return "Trưởng nhóm";
    case "ADMIN":
      return "Phó nhóm";
    default:
      return "Thành viên";
  }
}

interface ConversationInfoPanelProps {
  isOpen: boolean;
  conversation: ConversationItemType;
  currentUser: { _id: string };
}

const ConversationInfoPanel = ({
  isOpen,
  conversation,
  currentUser,
}: ConversationInfoPanelProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUserFromStore = useAppSelector((state) => state.auth.user);
  const conversations = useAppSelector((state) => state.conversation.conversations);
  const { socket } = useSocket();
  const currentUserId =
    currentUserFromStore?.userId ||
    (currentUserFromStore as { _id?: string } | null | undefined)?._id ||
    currentUser?._id ||
    "";
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    media: true,
    file: false,
    link: false,
    members: true,
  });
  const [members, setMembers] = useState<ConversationMemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberPendingRemove, setMemberPendingRemove] =
    useState<ConversationMemberRow | null>(null);
  const [memberPendingTransfer, setMemberPendingTransfer] =
    useState<ConversationMemberRow | null>(null);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [leaveGroupErrorDialogOpen, setLeaveGroupErrorDialogOpen] = useState(false);
  const [leaveGroupErrorMessage, setLeaveGroupErrorMessage] = useState("");

  const isGroup = conversation?.type === "GROUP";

  const [preview, setPreview] = useState<{
    isOpen: boolean;
    index: number;
  }>({
    isOpen: false,
    index: 0,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (!conversation?.conversationId) return;

    fetchMediaPreview();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !conversation?.conversationId) return;
  }, [expandedSections, isOpen, conversation?.conversationId]);

  useEffect(() => {
    if (!isOpen || !isGroup || !conversation?.conversationId) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    const loadMembers = async () => {
      setMembersLoading(true);
      try {
        const res = await conversationService.getListMembers(
          conversation.conversationId,
        );
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setMembers(res.data as ConversationMemberRow[]);
        } else {
          setMembers([]);
        }
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isGroup, conversation?.conversationId, membersRefreshKey]);

  const fetchMediaPreview = async () => {
    if (!currentUserId) return;
    try {
      const res = await messageService.getMediasPreview(
        currentUserId,
        conversation.conversationId,
      );
      if (res.success) {
        setMedias(res.data.images_videos || []);
        setFiles(res.data.files || []);
        setLinks(res.data.links || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSection = (
    section: "media" | "file" | "link" | "members",
  ) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const currentMember = members.find(
    (m) => String(m.userId) === String(currentUserId),
  );
  const canManageMembers =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const canRemoveMember = (target: ConversationMemberRow) => {
    if (!canManageMembers) return false;
    if (String(target.userId) === String(currentUserId)) return false;
    if (currentMember?.role === "ADMIN" && target.role === "OWNER") return false;
    return true;
  };

  const canShowRoleMenu = (target: ConversationMemberRow) => {
    if (currentMember?.role !== "OWNER") return false;
    if (String(target.userId) === String(currentUserId)) return false;
    return true;
  };

  const handleUpdateMemberRole = async (
    target: ConversationMemberRow,
    newRole: "ADMIN" | "MEMBER",
  ) => {
    if (!conversation?.conversationId) return;
    if (currentMember?.role !== "OWNER") return;
    if (String(target.userId) === String(currentUserId)) return;

    try {
      const res = await conversationService.updateMembersRole(
        conversation.conversationId,
        [target.userId],
        newRole,
      );

      if (!res?.success) {
        return;
      }

      setMembers((prev) =>
        prev.map((member) =>
          member.userId === target.userId ? { ...member, role: newRole } : member,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferOwner = async (target: ConversationMemberRow) => {
    if (!conversation?.conversationId) return;
    if (currentMember?.role !== "OWNER") return;
    if (String(target.userId) === String(currentUserId)) return;

    try {
      const res = await conversationService.transferOwner(
        conversation.conversationId,
        target.userId,
      );
      if (!res?.success) return;

      setMembers((prev) =>
        prev.map((member) => {
          if (member.userId === target.userId) {
            return { ...member, role: "OWNER" };
          }
          if (member.userId === currentUserId) {
            return { ...member, role: "MEMBER" };
          }
          return member;
        }),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveMember = async (target: ConversationMemberRow) => {
    if (!conversation?.conversationId || !canRemoveMember(target)) return;

    try {
      setRemovingMemberId(target.userId);
      const res = await conversationService.removeMember(
        conversation.conversationId,
        target.userId,
      );

      if (!res?.success) return;

      setMembers((prev) =>
        prev.filter((member) => member.userId !== target.userId),
      );
      setMembersRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversation?.conversationId || isLeavingGroup) return;

    try {
      setIsLeavingGroup(true);
      const res = await conversationService.leaveGroup(conversation.conversationId);

      if (!res?.success) {
        const message =
          typeof res?.message === "string"
            ? res.message
            : "Bạn cần chuyển quyền Trưởng nhóm cho thành viên khác trước khi rời nhóm.";
        setLeaveGroupErrorMessage(message);
        setLeaveGroupErrorDialogOpen(true);
        return;
      }

      dispatch(
        setConversations(
          conversations.filter(
            (item) => item.conversationId !== conversation.conversationId,
          ),
        ),
      );
      setLeaveGroupDialogOpen(false);
      navigate("/");
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage[0]
        : rawMessage || "Bạn cần chuyển quyền Trưởng nhóm cho thành viên khác trước khi rời nhóm.";
      setLeaveGroupErrorMessage(message);
      setLeaveGroupErrorDialogOpen(true);
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();

      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!preview.isOpen) return;

      if (e.key === "Escape") {
        setPreview({ isOpen: false, index: 0 });
      }

      if (e.key === "ArrowRight") {
        setPreview((prev) => ({
          ...prev,
          index: Math.min(prev.index + 1, medias.length - 1),
        }));
      }

      if (e.key === "ArrowLeft") {
        setPreview((prev) => ({
          ...prev,
          index: Math.max(prev.index - 1, 0),
        }));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview.isOpen, medias.length]);

  useEffect(() => {
    if (!socket || !conversation?.conversationId) return;

    const handleRoleUpdated = (payload: any) => {
      const isTargetConversation =
        payload?.conversationId === conversation.conversationId;
      if (!isTargetConversation) return;

      const updateData =
        payload?.type === "ROLE_UPDATE" ? payload?.data : payload?.data || payload;

      const memberIds = (updateData?.memberIds || []) as string[];
      const newRole = updateData?.newRole as ConversationMemberRow["role"] | undefined;
      const newRoles = updateData?.newRoles as
        | Record<string, ConversationMemberRow["role"]>
        | undefined;

      if (newRoles && typeof newRoles === "object") {
        setMembers((prev) =>
          prev.map((member) =>
            newRoles[member.userId]
              ? { ...member, role: newRoles[member.userId] }
              : member,
          ),
        );
        return;
      }

      if (!Array.isArray(memberIds) || !newRole) return;

      setMembers((prev) =>
        prev.map((member) =>
          memberIds.includes(member.userId) ? { ...member, role: newRole } : member,
        ),
      );
    };

    socket.on("conversation_updated", handleRoleUpdated);
    socket.on("role_updated", handleRoleUpdated);

    return () => {
      socket.off("conversation_updated", handleRoleUpdated);
      socket.off("role_updated", handleRoleUpdated);
    };
  }, [socket, conversation?.conversationId]);

  if (!isOpen) return <div className="w-0 overflow-hidden" />;

  return (
    <div className="w-[320px] h-full bg-[#f7f8fa] border-l flex flex-col">
      {/* HEADER */}
      <div className="h-14 bg-white flex items-center justify-between px-4 border-b">
        <h2 className="text-[15px] font-medium text-gray-800">
          Thông tin hội thoại
        </h2>
        <X size={18} className="text-gray-500 cursor-pointer" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* PROFILE */}
        <div className="bg-white flex flex-col items-center py-5">
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={conversation?.avatar} />
            <AvatarFallback>{conversation?.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <h3 className="text-[15px] font-medium text-gray-900 text-center px-3">
            {conversation?.name}
          </h3>
        </div>

        {/* ACTION */}
        <div className="bg-white py-3 flex items-start px-10">
          {/* BUTTON */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isMuted ? (
                <BellOff size={18} className="text-[#0068ff]" />
              ) : (
                <Bell size={18} className="text-gray-600" />
              )}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              Tắt thông báo
            </span>
          </button>

          <button
            onClick={() => setIsPinned(!isPinned)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isPinned ? (
                <PinOff size={18} className="text-[#0068ff]" />
              ) : (
                <Pin size={18} className="text-gray-600" />
              )}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              Ghim hội thoại
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isGroup) setAddMemberModalOpen(true);
            }}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isGroup ? <UserPlus size={18} /> : <Users size={18} />}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              {isGroup ? "Thêm thành viên" : "Tạo nhóm"}
            </span>
          </button>
        </div>

        {/* MEDIA */}
        <div className="bg-white mt-2">
          <button
            onClick={() => toggleSection("media")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon size={18} />
              <span className="text-[14px] font-medium">Ảnh/Video</span>
            </div>
            {expandedSections.media ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.media && (
            <div className="px-4 pb-4">
              {medias.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5">
                  {medias.slice(0, 6).map((media, idx) => {
                    const file = media?.content?.file;
                    const isVideo = file?.type === "VIDEO";

                    return (
                      <div
                        key={idx}
                        className="aspect-square bg-gray-100 overflow-hidden relative cursor-pointer"
                        onClick={() =>
                          setPreview({
                            isOpen: true,
                            index: idx,
                          })
                        }
                      >
                        {isVideo ? (
                          <>
                            <video
                              src={file?.fileKey}
                              className="w-full h-full object-cover"
                              muted
                            />

                            {/* overlay play icon giống Zalo */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="ml-1 border-l-8 border-l-white border-y-6 border-y-transparent" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={file?.fileKey}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có ảnh/video trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black cursor-pointer hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* FILE */}
        <div className="bg-white mt-0.5">
          <button
            onClick={() => toggleSection("file")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} />
              <span className="text-[14px] font-medium">File</span>
            </div>
            {expandedSections.file ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.file && (
            <div className="px-4 pb-4">
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.slice(0, 6).map((item, idx) => {
                    const file = item.content?.file;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-white hover:bg-gray-50 rounded-lg border transition"
                      >
                        {/* ICON */}
                        <div className="shrink-0">
                          {getFileIcon(file.fileName)}
                        </div>

                        {/* INFO */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">
                            {file.fileName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {getDateLabel(item.createdAt)} •{" "}
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        {/* DOWNLOAD */}
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 border rounded-md hover:bg-gray-100 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có file trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* LINK */}
        <div className="bg-white mt-0.5">
          <button
            onClick={() => toggleSection("link")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LinkIcon size={18} />
              <span className="text-[14px] font-medium">Link</span>
            </div>
            {expandedSections.link ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.link && (
            <div className="px-4 pb-4 space-y-2">
              {links.length > 0 ? (
                links.slice(0, 6).map((item, idx) => {
                  const url = item.content?.text;

                  const getDomain = (url: string) => {
                    try {
                      return new URL(url).hostname.replace("www.", "");
                    } catch {
                      return url;
                    }
                  };

                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 transition"
                    >
                      {/* ICON */}
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md shrink-0">
                        <LinkIcon size={18} />
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#0068ff] truncate">
                          {url}
                        </p>

                        <p className="text-[11px] text-gray-500 truncate">
                          {getDomain(url)}
                        </p>
                      </div>

                      {/* TIME */}
                      <div className="text-[10px] text-gray-400 shrink-0">
                        {getDateLabel(item.createdAt)}
                      </div>
                    </a>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có link trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* GROUP */}
        {isGroup && (
          <div className="bg-white mt-2">
            <button
              type="button"
              onClick={() => toggleSection("members")}
              className="h-12 w-full flex items-center justify-between px-4 gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span className="text-[14px] font-medium">Thành viên</span>
                <span className="text-[12px] text-gray-400">
                  ({membersLoading ? "…" : members.length})
                </span>
              </div>
              {expandedSections.members ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>

            {expandedSections.members && (
              <div className="px-2 pb-3 max-h-72 overflow-y-auto border-t border-gray-100">
                {membersLoading ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Đang tải danh sách...
                  </p>
                ) : members.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Không có thành viên
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 pt-1">
                    {members.map((m) => (
                      <li
                        key={m.userId}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50"
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={m.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback>
                            {m.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate flex items-center gap-1.5">
                            {m.name}
                            {m.role === "OWNER" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600 leading-none align-middle">
                                Trưởng nhóm
                              </span>
                            )}
                            {m.role === "ADMIN" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 leading-none align-middle">
                                Phó nhóm
                              </span>
                            )}
                          </p>
                        </div>
                        {canShowRoleMenu(m) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 cursor-pointer"
                                title="Tùy chọn thành viên"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {m.role === "MEMBER" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateMemberRole(m, "ADMIN")}
                                >
                                  Bổ nhiệm Phó nhóm
                                </DropdownMenuItem>
                              )}
                              {m.role === "ADMIN" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateMemberRole(m, "MEMBER")}
                                >
                                  Gỡ chức Phó nhóm
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setMemberPendingTransfer(m)}
                              >
                                Chuyển trưởng nhóm
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {canRemoveMember(m) && (
                          <button
                            type="button"
                            onClick={() => setMemberPendingRemove(m)}
                            disabled={removingMemberId === m.userId}
                            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                            title="Xoá thành viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button className="h-12 w-full flex items-center px-4 gap-3 border-t">
              <Link2 size={18} />
              <span className="text-[14px]">Link nhóm</span>
            </button>
          </div>
        )}

        {/* DANGER */}
        <div className="bg-white mt-2">
          <button
            type="button"
            onClick={() => {
              if (isGroup) {
                setLeaveGroupDialogOpen(true);
              }
            }}
            className="h-12 w-full flex items-center px-4 gap-3 text-red-500 cursor-pointer border-t"
          >
            {isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
            <span className="text-[14px]">
              {isGroup ? "Rời nhóm" : "Xóa lịch sử"}
            </span>
          </button>
        </div>
      </div>

      {preview.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* CLOSE */}
          <button
            onClick={() => setPreview({ isOpen: false, index: 0 })}
            className="absolute top-5 right-5 text-white hover:opacity-70 cursor-pointer"
          >
            <X size={28} />
          </button>

          {/* DOWNLOAD */}
          <button
            onClick={() => {
              const file = medias[preview.index]?.content?.file;
              handleDownload(file);
            }}
            className="absolute top-5 left-5 text-white hover:opacity-70 cursor-pointer"
          >
            <Download size={24} />
          </button>

          {/* PREV */}
          {preview.index > 0 && (
            <button
              onClick={() =>
                setPreview((prev) => ({
                  ...prev,
                  index: prev.index - 1,
                }))
              }
              className="absolute left-5 text-white bg-black/50 p-2 rounded-full cursor-pointer"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* NEXT */}
          {preview.index < medias.length - 1 && (
            <button
              onClick={() =>
                setPreview((prev) => ({
                  ...prev,
                  index: prev.index + 1,
                }))
              }
              className="absolute right-5 text-white bg-black/50 p-2 rounded-full cursor-pointer"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* CONTENT */}
          <div
            className="max-w-[90%] max-h-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const file = medias[preview.index]?.content?.file;

              if (!file) return null;

              return file.type === "VIDEO" ? (
                <video
                  src={file.fileKey}
                  controls
                  autoPlay
                  className="max-h-[85vh] rounded-lg"
                />
              ) : (
                <img
                  src={file.fileKey}
                  className="max-h-[85vh] rounded-lg object-contain"
                />
              );
            })()}
          </div>
        </div>
      )}

      {isGroup && conversation?.conversationId && (
        <CreateGroupModal
          open={addMemberModalOpen}
          onOpenChange={setAddMemberModalOpen}
          mode="ADD_MEMBER"
          conversationId={conversation.conversationId}
          excludeUserIds={members.map((m) => m.userId)}
          onMembersAdded={() => setMembersRefreshKey((k) => k + 1)}
        />
      )}

      <AlertDialog
        open={Boolean(memberPendingRemove)}
        onOpenChange={(open) => {
          if (!open) setMemberPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              {`Bạn có chắc chắn muốn mời ${
                memberPendingRemove?.name || "thành viên này"
              } rời khỏi nhóm không?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!memberPendingRemove) return;
                handleRemoveMember(memberPendingRemove);
                setMemberPendingRemove(null);
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(memberPendingTransfer)}
        onOpenChange={(open) => {
          if (!open) setMemberPendingTransfer(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển nhượng Trưởng nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              {`Bạn sẽ mất quyền điều hành nhóm. Xác nhận chuyển Trưởng nhóm cho ${
                memberPendingTransfer?.name || "thành viên này"
              }?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!memberPendingTransfer) return;
                handleTransferOwner(memberPendingTransfer);
                setMemberPendingTransfer(null);
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={leaveGroupDialogOpen}
        onOpenChange={setLeaveGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận rời nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn rời nhóm này? Bạn sẽ không thể xem lại tin
              nhắn mới sau khi rời đi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingGroup}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white rounded-md"
              onClick={(e) => {
                e.preventDefault();
                handleLeaveGroup();
              }}
              disabled={isLeavingGroup}
            >
              {isLeavingGroup ? "Đang xử lý..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={leaveGroupErrorDialogOpen}
        onOpenChange={setLeaveGroupErrorDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thông báo</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveGroupErrorMessage ||
                "Bạn cần chuyển quyền Trưởng nhóm cho thành viên khác trước khi rời nhóm."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-[#0068ff] hover:bg-[#0052cc] text-white rounded-md"
              onClick={(e) => {
                e.preventDefault();
                setLeaveGroupErrorDialogOpen(false);
              }}
            >
              Đã hiểu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConversationInfoPanel;
