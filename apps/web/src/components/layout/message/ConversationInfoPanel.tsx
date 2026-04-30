import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
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
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  X as CloseIcon,
  Download,
  ChevronLeft,
  UserCheck,
  Settings2,
  Check,
  Pencil,
} from "lucide-react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import CreateGroupModal from "@/components/layout/CreateGroupModal";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Services & Redux
import { messageService } from "@/services/message.service";
import { conversationService } from "@/services/conversation.service";
import {
  pinConversation,
  unpinConversation,
  muteConversation,
  unmuteConversation,
} from "@/services/conversation-settings.service";
import { useAppDispatch, useAppSelector } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  removeConversation,
  updateConversationSetting,
} from "@/store/slices/conversationSlice";

// Types & Utils
import type { ConversationItemType } from "@/types/conversation-item.type";
import { getFileIcon } from "@/utils/file-icon.util";
import { getDateLabel } from "@/utils/format-message-time..util";
import { getAvatarData, getColorByName } from "@/utils/avatar-utils";
import { Users as UsersIcon } from "lucide-react";

type ConversationMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

const MUTE_OPTIONS = [
  { label: "Trong 1 giờ", duration: 60 },
  { label: "Trong 4 giờ", duration: 240 },
  { label: "Cho đến 8:00 AM", duration: -2 },
  { label: "Cho đến khi mở lại", duration: -1 },
];

interface ConversationInfoPanelProps {
  isOpen: boolean;
  conversation: ConversationItemType | null;
  onClose?: () => void;
}

const ConversationInfoPanel = ({
  isOpen,
  conversation,
  onClose,
}: ConversationInfoPanelProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);
  const currentUserId = user?.userId || (user as any)?._id || "";

  // Đồng bộ hội thoại từ store để lấy trạng thái Pin/Mute mới nhất
  const currentConversation = useAppSelector((state) =>
    conversation?.conversationId
      ? (state.conversation.conversations.find(
          (c) => c.conversationId === conversation.conversationId,
        ) ?? conversation)
      : null,
  );

  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const { refs, floatingStyles } = useFloating({
    open: showMuteOptions,
    onOpenChange: setShowMuteOptions,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [managementLoading, setManagementLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    media: true,
    file: false,
    link: false,
    members: true,
    management: false,
    requests: true,
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
  const [leaveGroupErrorDialogOpen, setLeaveGroupErrorDialogOpen] =
    useState(false);
  const [leaveGroupErrorMessage, setLeaveGroupErrorMessage] = useState("");
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const [preview, setPreview] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentConversation?.name || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGroup = currentConversation?.type === "GROUP";
  const isPinned = currentConversation?.pinned ?? false;
  const isMuted =
    !!currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      currentConversation.mutedUntil === "infinite" ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  const currentMember = members.find(
    (m) => String(m.userId) === String(currentUserId),
  );
  const canManageMembers =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const canInvite =
    currentConversation?.group?.allowMembersInvite || canManageMembers;

  // --- FETCH DATA ---

  useEffect(() => {
    if (isOpen && isGroup && canManageMembers) {
      fetchJoinRequests();
    }
  }, [
    isOpen,
    conversation?.conversationId,
    membersRefreshKey,
    canManageMembers,
  ]);

  useEffect(() => {
    if (!isOpen || !currentConversation?.conversationId) return;

    const fetchData = async () => {
      try {
        const res = await messageService.getMediasPreview(
          currentUserId,
          currentConversation.conversationId,
        );
        if (res.success) {
          setMedias(res.data.images_videos || []);
          setFiles(res.data.files || []);
          setLinks(res.data.links || []);
        }
      } catch (error) {
        console.error("Fetch media error:", error);
      }
    };
    fetchData();
  }, [isOpen, currentConversation?.conversationId, currentUserId]);

  useEffect(() => {
    if (!isOpen || !isGroup || !currentConversation?.conversationId) {
      setMembers([]);
      return;
    }

    let isMounted = true;
    const loadMembers = async () => {
      setMembersLoading(true);
      try {
        const res = await conversationService.getListMembers(
          currentConversation.conversationId,
        );
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setMembers(res.data as ConversationMemberRow[]);
        }
      } finally {
        if (isMounted) setMembersLoading(false);
      }
    };

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isGroup, currentConversation?.conversationId, membersRefreshKey]);

  // --- SOCKET LISTENERS (GROUP MANAGEMENT) ---
  useEffect(() => {
    if (!socket || !currentConversation?.conversationId) return;
    const convId = currentConversation.conversationId;

    const handleRoleUpdated = (payload: any) => {
      if (payload?.conversationId !== currentConversation.conversationId)
        return;
      setMembersRefreshKey((k) => k + 1);
    };

    const handleNewMessage = (message: any) => {
      if (message?.conversationId !== currentConversation.conversationId)
        return;
      if (message.type === "SYSTEM") {
        setMembersRefreshKey((k) => k + 1);
      }
    };

    const handleNewRequest = (data: any) => {
      if (data.conversationId === convId) {
        fetchJoinRequests();
        toast.info("Có yêu cầu tham gia nhóm mới");
      }
    };

    const handleMemberUpdate = (data: any) => {
      if (data.conversationId === convId) {
        setMembersRefreshKey((k) => k + 1);
        fetchJoinRequests();
      }
    };

    socket.on("conversation_updated", handleRoleUpdated);
    socket.on("role_updated", handleRoleUpdated);
    socket.on("member_removed", handleRoleUpdated);
    socket.on("new_message", handleNewMessage);
    socket.on("new_approval_request", handleNewRequest);
    socket.on("member_updated", handleMemberUpdate);

    return () => {
      socket.off("conversation_updated", handleRoleUpdated);
      socket.off("role_updated", handleRoleUpdated);
      socket.off("member_removed", handleRoleUpdated);
      socket.off("new_message", handleNewMessage);
      socket.off("new_approval_request", handleNewRequest);
      socket.off("member_updated", handleMemberUpdate);
    };
  }, [socket, currentConversation?.conversationId]);

  // --- SOCKET LISTENERS (MEDIA ROOMS TỪ NHÁNH KhongVanTam) ---
  useEffect(() => {
    if (!socket || !isOpen || !currentConversation?.conversationId) return;

    const conversationId = currentConversation.conversationId;
    const mediaRooms = [
      `media_${conversationId}_IMAGE_VIDEO`,
      `media_${conversationId}_FILE`,
      `media_${conversationId}_LINK`,
    ];

    // Join specialized media rooms
    mediaRooms.forEach((room) => socket.emit("join_room", room));

    const handleNewMedia = (payload: { type: string; data: any }) => {
      const { type, data } = payload;
      if (type === "IMAGE_VIDEO") {
        setMedias((prev) => [data, ...prev].slice(0, 6));
      }
      if (type === "FILE") {
        setFiles((prev) => [data, ...prev].slice(0, 6)); // Lấy 6 file
      }
      if (type === "LINK") {
        setLinks((prev) => [data, ...prev].slice(0, 6));
      }
    };

    socket.on("new_media", handleNewMedia);

    return () => {
      mediaRooms.forEach((room) => socket.emit("leave_room", room));
      socket.off("new_media", handleNewMedia);
    };
  }, [socket, isOpen, currentConversation?.conversationId]);

  // --- KEYBOARD NAVIGATION FOR PREVIEW ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!preview.isOpen) return;
      if (e.key === "Escape") setPreview({ isOpen: false, index: 0 });
      if (e.key === "ArrowRight")
        setPreview((p) => ({
          ...p,
          index: Math.min(p.index + 1, medias.length - 1),
        }));
      if (e.key === "ArrowLeft")
        setPreview((p) => ({ ...p, index: Math.max(p.index - 1, 0) }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview.isOpen, medias.length]);

  // --- HANDLERS ---
  const fetchJoinRequests = async () => {
    if (!currentConversation?.conversationId) return;
    try {
      const res = await conversationService.getJoinRequests(
        currentConversation.conversationId,
      );
      if (res?.success) {
        const requestsArray = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setJoinRequests(requestsArray);
      }
    } catch (error) {
      console.error("Lỗi fetch request:", error);
    }
  };

  const handleUpdateSetting = async (key: string, value: boolean) => {
    try {
      setManagementLoading(true);
      const res = await conversationService.updateGroupSettings(
        currentConversation!.conversationId,
        { [key]: value },
      );
      if (res.success) {
        toast.success("Đã cập nhật cài đặt nhóm");
        setMembersRefreshKey((k) => k + 1);
        dispatch(
          updateConversationSetting({
            conversationId: currentConversation!.conversationId,
            group: { ...currentConversation!.group, [key]: value },
          }),
        );
      }
    } catch (error) {
      toast.error("Không thể cập nhật cài đặt");
    } finally {
      setManagementLoading(false);
    }
  };

  const onHandleRequest = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    try {
      const res = await conversationService.handleJoinRequest(
        currentConversation!.conversationId,
        requestId,
        action,
      );
      if (res.success) {
        toast.success(
          action === "approve" ? "Đã duyệt thành viên" : "Đã từ chối",
        );
        setJoinRequests((prev) => prev.filter((r) => r._id !== requestId));
        if (action === "approve") setMembersRefreshKey((k) => k + 1);
      }
    } catch (error) {
      toast.error("Thao tác thất bại");
    }
  };

  const handlePin = async () => {
    if (!currentConversation) return;
    const newStatus = !isPinned;
    dispatch(
      updateConversationSetting({
        conversationId: currentConversation.conversationId,
        pinned: newStatus,
      }),
    );
    try {
      newStatus
        ? await pinConversation(
            currentUserId,
            currentConversation.conversationId,
          )
        : await unpinConversation(
            currentUserId,
            currentConversation.conversationId,
          );
    } catch {
      dispatch(
        updateConversationSetting({
          conversationId: currentConversation.conversationId,
          pinned: !newStatus,
        }),
      );
    }
  };

  const handleMute = async (duration: number) => {
    if (!currentConversation) return;
    setShowMuteOptions(false);

    let mutedUntil: string | null = null;
    if (duration === -1) mutedUntil = "infinite";
    else if (duration === -2) {
      const next8AM = new Date();
      if (next8AM.getHours() >= 8) next8AM.setDate(next8AM.getDate() + 1);
      next8AM.setHours(8, 0, 0, 0);
      mutedUntil = next8AM.toISOString();
    } else if (duration > 0) {
      mutedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    const isUnmuting = duration === 0;
    const prevMuted = currentConversation.muted;
    const prevMutedUntil = currentConversation.mutedUntil;

    dispatch(
      updateConversationSetting({
        conversationId: currentConversation.conversationId,
        muted: !isUnmuting,
        mutedUntil,
      }),
    );

    try {
      isUnmuting
        ? await unmuteConversation(
            currentUserId,
            currentConversation.conversationId,
          )
        : await muteConversation(
            currentUserId,
            currentConversation.conversationId,
            duration,
          );
    } catch {
      dispatch(
        updateConversationSetting({
          conversationId: currentConversation.conversationId,
          muted: prevMuted,
          mutedUntil: prevMutedUntil ?? null,
        }),
      );
    }
  };

  const handleUpdateMemberRole = async (
    target: ConversationMemberRow,
    newRole: "ADMIN" | "MEMBER",
  ) => {
    if (!currentConversation?.conversationId) return;
    try {
      const res = await conversationService.updateMembersRole(
        currentConversation.conversationId,
        [target.userId],
        newRole,
      );
      if (res?.success) setMembersRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferOwner = async (target: ConversationMemberRow) => {
    if (!currentConversation?.conversationId) return;
    try {
      const res = await conversationService.transferOwner(
        currentConversation.conversationId,
        target.userId,
      );
      if (res?.success) {
        toast.success("Đã chuyển quyền trưởng nhóm thành công");
        setMemberPendingTransfer(null);
        setMembersRefreshKey((k) => k + 1);
      }
    } catch (error) {
      toast.error("Chuyển quyền trưởng nhóm thất bại");
    }
  };

  const handleRemoveMember = async (target: ConversationMemberRow) => {
    if (!currentConversation?.conversationId) return;
    try {
      setRemovingMemberId(target.userId);
      const res = await conversationService.removeMember(
        currentConversation.conversationId,
        target.userId,
      );
      if (res?.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== target.userId));
        setMemberPendingRemove(null);
      }
    } catch (error) {
      console.error("Lỗi xóa thành viên:", error);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentConversation?.conversationId || isLeavingGroup) return;
    try {
      setIsLeavingGroup(true);
      const res = await conversationService.leaveGroup(
        currentConversation.conversationId,
      );
      if (!res?.success) {
        setLeaveGroupErrorMessage(
          res?.message || "Bạn cần chuyển quyền Trưởng nhóm trước khi rời đi.",
        );
        setLeaveGroupErrorDialogOpen(true);
        return;
      }
      dispatch(
        removeConversation({
          conversationId: currentConversation.conversationId,
        }),
      );
      toast.success("Đã rời nhóm thành công");
      navigate("/");
    } catch {
      setLeaveGroupErrorDialogOpen(true);
    } finally {
      setIsLeavingGroup(false);
      setLeaveGroupDialogOpen(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentConversation?.conversationId || isDeletingGroup) return;
    try {
      setIsDeletingGroup(true);
      const res = await conversationService.deleteGroup(
        currentConversation.conversationId,
      );
      if (res?.success) {
        dispatch(
          removeConversation({
            conversationId: currentConversation.conversationId,
          }),
        );
        toast.success("Đã giải tán nhóm thành công");
        navigate("/");
      }
    } catch (error) {
      toast.error("Giải tán nhóm thất bại");
    } finally {
      setIsDeletingGroup(false);
      setDeleteGroupDialogOpen(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === currentConversation?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await conversationService.updateGroupMetadata(
        currentConversation!.conversationId,
        { name: newName.trim() },
      );
      if (res.success) {
        toast.success("Đổi tên nhóm thành công");
        setIsEditingName(false);
      }
    } catch (error) {
      toast.error("Không thể đổi tên nhóm");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh quá lớn (<5MB)");

    try {
      toast.loading("Đang cập nhật ảnh nhóm...", { id: "upload-avatar" });

      const res = await conversationService.updateGroupMetadata(
        currentConversation!.conversationId,
        { avatar: file },
      );

      if (res.success) {
        toast.success("Cập nhật ảnh thành công", { id: "upload-avatar" });

        dispatch(
          updateConversationSetting({
            conversationId: currentConversation!.conversationId,
            avatar: res.data.group?.avatarUrl || res.data.avatar,
          }),
        );
      }
    } catch (error) {
      toast.error("Lỗi khi tải ảnh lên", { id: "upload-avatar" });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  if (!isOpen) return <div className="w-0 overflow-hidden" />;

  return (
    <div className="w-[320px] h-full bg-[#f7f8fa] border-l flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
      {/* HEADER */}
      <div className="h-14 bg-white flex items-center justify-between px-4 border-b shrink-0">
        <h2 className="text-[16px] font-semibold text-gray-800">
          Thông tin hội thoại
        </h2>
        <CloseIcon
          size={20}
          className="text-gray-500 cursor-pointer hover:bg-gray-100 rounded-full p-0.5"
          onClick={onClose}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* PROFILE SECTION */}
        <div className="bg-white flex flex-col items-center py-6 border-b">
          <div className="relative group">
            <Avatar className="w-20 h-20 mb-3 border-2 border-white shadow-md">
              <AvatarImage src={currentConversation?.avatar} />
              <AvatarFallback 
                className="text-2xl text-white font-bold"
                style={{ backgroundColor: getColorByName(currentConversation?.name || "") }}
              >
                {(() => {
                  const { initials, isGroupIcon } = getAvatarData(currentConversation?.name || "");
                  return isGroupIcon ? <Users className="w-10 h-10" /> : initials;
                })()}
              </AvatarFallback>
            </Avatar>
            {isGroup && canManageMembers && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-0 p-1.5 bg-white rounded-full shadow-lg border cursor-pointer hover:bg-gray-50"
                >
                  <Pencil size={12} className="text-gray-600" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 px-4 w-full">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full px-4">
                <input
                  autoFocus
                  className="border-b-2 border-blue-500 outline-none text-center font-bold w-full text-[17px]"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-center group">
                <h3 className="text-[17px] font-bold text-gray-900 leading-tight">
                  {currentConversation?.name}
                </h3>
                {isGroup && canManageMembers && (
                  <Pencil
                    size={14}
                    className="text-gray-400 cursor-pointer opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-all"
                    onClick={() => setIsEditingName(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white py-4 flex items-start justify-between px-6 border-b">
          {/* Mute Button */}
          <div className="flex flex-col items-center gap-1.5 flex-1 relative">
            <button
              ref={refs.setReference}
              onClick={() =>
                isMuted ? handleMute(0) : setShowMuteOptions(!showMuteOptions)
              }
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                }`}
              >
                {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
              </div>
              <span className="text-[11px] font-medium text-gray-600">
                Thông báo
              </span>
            </button>
            {/* Popover Mute options */}
            {showMuteOptions && (
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-50 bg-white border shadow-lg rounded-md w-48 py-1 text-sm font-medium"
              >
                {MUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.duration}
                    onClick={() => handleMute(opt.duration)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pin Button */}
          <button
            onClick={handlePin}
            className="flex flex-col items-center gap-1.5 flex-1 group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isPinned
                  ? "bg-blue-50 text-blue-600"
                  : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
              }`}
            >
              {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
            </div>
            <span className="text-[11px] font-medium text-gray-600">Ghim</span>
          </button>

          {/* Add Member / Create Group Button */}
          {isGroup ? (
            canInvite && (
              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="flex flex-col items-center gap-1.5 flex-1 group animate-in fade-in zoom-in duration-200 cursor-pointer"
              >
                <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <UserPlus size={20} />
                </div>
                <span className="text-[11px] font-medium text-gray-600">
                  Thêm TV
                </span>
              </button>
            )
          ) : (
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="flex flex-col items-center gap-1.5 flex-1 group animate-in fade-in zoom-in duration-200 cursor-pointer"
            >
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <UsersIcon size={20} />
              </div>
              <span className="text-[11px] font-medium text-gray-600">
                Tạo nhóm
              </span>
            </button>
          )}
        </div>

        {/* SECTION: PHÊ DUYỆT THÀNH VIÊN */}
        {isGroup && canManageMembers && joinRequests.length > 0 && (
          <div className="bg-white mt-2 border-y border-blue-100 shadow-sm">
            <button
              onClick={() => toggleSection("requests")}
              className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
            >
              <div className="flex items-center gap-3 text-blue-600">
                <UserCheck size={18} />
                <span className="text-[14px] font-bold">
                  Yêu cầu tham gia ({joinRequests.length})
                </span>
              </div>
              {expandedSections.requests ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {expandedSections.requests && (
              <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {joinRequests.map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between p-2 bg-blue-50/40 rounded-lg border border-blue-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-9 h-9 border border-white shadow-sm">
                        <AvatarImage src={req.userId?.profile?.avatarUrl} />
                      </Avatar>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {req.userId?.profile?.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Mời bởi: {req.invitedBy?.profile?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => onHandleRequest(req._id, "approve")}
                        className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => onHandleRequest(req._id, "reject")}
                        className="p-1.5 bg-white text-gray-400 border rounded-full hover:bg-gray-50 shadow-sm cursor-pointer"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: CÀI ĐẶT QUẢN TRỊ NHÓM */}
        {isGroup && canManageMembers && (
          <div className="bg-white mt-2 border-y">
            <button
              onClick={() => toggleSection("management")}
              className="h-12 w-full flex items-center justify-between px-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings2 size={18} className="text-gray-600" />
                <span className="text-[14px] font-medium text-gray-800">
                  Cài đặt nhóm
                </span>
              </div>
              {expandedSections.management ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </button>
            {expandedSections.management && (
              <div className="px-4 pb-4 space-y-5 pt-2 animate-in fade-in duration-200">
                {/* 1. QUYỀN MỜI THÀNH VIÊN */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-gray-700">
                      Quyền mời thành viên
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Thành viên thường có thể mời người khác
                    </p>
                  </div>
                  <Switch
                    disabled={managementLoading}
                    checked={
                      currentConversation?.group?.allowMembersInvite !== false
                    }
                    onCheckedChange={(val) =>
                      handleUpdateSetting("allowMembersInvite", val)
                    }
                  />
                </div>

                {/* 2. QUYỀN GỬI TIN NHẮN */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-gray-700">
                      Quyền gửi tin nhắn
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Cho phép mọi người cùng nhắn tin
                    </p>
                  </div>
                  <Switch
                    disabled={managementLoading}
                    checked={
                      currentConversation?.group?.allowMembersSendMessages !==
                      false
                    }
                    onCheckedChange={(val) =>
                      handleUpdateSetting("allowMembersSendMessages", val)
                    }
                  />
                </div>

                {/* 3. PHÊ DUYỆT THÀNH VIÊN */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-blue-600">
                      Phê duyệt thành viên mới
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Admin cần phê duyệt trước khi vào nhóm
                    </p>
                  </div>
                  <Switch
                    disabled={managementLoading}
                    checked={
                      currentConversation?.group?.approvalRequired || false
                    }
                    onCheckedChange={(val) =>
                      handleUpdateSetting("approvalRequired", val)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MEDIA SECTION */}
        <div className="bg-white mt-2 border-t">
          <button
            onClick={() => toggleSection("media")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon size={18} className="text-gray-600" />
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
                <div className="grid grid-cols-3 gap-1">
                  {medias.slice(0, 6).map((media, idx) => {
                    const file = media?.content?.file;
                    const isVideo = file?.type === "VIDEO";
                    return (
                      <div
                        key={idx}
                        className="aspect-square bg-gray-100 overflow-hidden relative cursor-pointer rounded-md border border-gray-200"
                        onClick={() => setPreview({ isOpen: true, index: idx })}
                      >
                        {isVideo ? (
                          <>
                            <video
                              src={file?.fileKey}
                              className="w-full h-full object-cover"
                              muted
                            />
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
                            alt=""
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
              {medias.length > 0 && (
                <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 mt-3 h-8 text-xs cursor-pointer">
                  Xem tất cả
                </Button>
              )}
            </div>
          )}
        </div>

        {/* FILE SECTION */}
        <div className="bg-white border-t">
          <button
            onClick={() => toggleSection("file")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-gray-600" />
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
                        className="flex items-center gap-3 p-2 bg-white hover:bg-gray-50 rounded-lg border transition group"
                      >
                        <div className="shrink-0">
                          {getFileIcon(file.fileName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">
                            {file.fileName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {getDateLabel(item.createdAt)} •{" "}
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 border rounded-md hover:bg-gray-100 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
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
              {files.length > 0 && (
                <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 mt-3 h-8 text-xs cursor-pointer">
                  Xem tất cả
                </Button>
              )}
            </div>
          )}
        </div>

        {/* LINK SECTION */}
        <div className="bg-white border-t">
          <button
            onClick={() => toggleSection("link")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LinkIcon size={18} className="text-gray-600" />
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
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md shrink-0">
                        <LinkIcon size={18} className="text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#0068ff] truncate">
                          {url}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {getDomain(url)}
                        </p>
                      </div>
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
              {links.length > 0 && (
                <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 mt-3 h-8 text-xs cursor-pointer">
                  Xem tất cả
                </Button>
              )}
            </div>
          )}
        </div>

        {/* MEMBERS SECTION */}
        {isGroup && (
          <div className="bg-white border-t">
            <button
              onClick={() => toggleSection("members")}
              className="h-12 w-full flex items-center justify-between px-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users size={18} className="text-gray-600" />
                <span className="text-[14px] font-medium text-gray-700">
                  Thành viên ({members.length})
                </span>
              </div>
              {expandedSections.members ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>

            {/* NỘI DUNG DANH SÁCH */}
            {expandedSections.members && (
              <div className="px-2 pb-3 animate-in fade-in duration-200">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group"
                  >
                    <Avatar className="w-10 h-10 border-0 shadow-sm">
                      <AvatarImage src={m.avatarUrl ?? ""} />
                      <AvatarFallback 
                        className="text-white font-bold"
                        style={{ backgroundColor: getColorByName(m.name) }}
                      >
                        {(() => {
                          const { initials, isGroupIcon } = getAvatarData(m.name);
                          return isGroupIcon ? <Users className="w-5 h-5" /> : initials;
                        })()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[14px] font-semibold text-gray-800 truncate flex-shrink">
                          {m.name}
                          {String(m.userId) === String(currentUserId) &&
                            " (Bạn)"}
                        </span>
                        {m.role === "OWNER" && (
                          <Badge className="bg-[#FFF2E5] text-[#E67E22] border-[#FFD9B3] text-[10px] font-extrabold h-5 px-3 shadow-none hover:bg-[#FFF2E5] uppercase tracking-widest whitespace-nowrap shrink-0 rounded-full">
                            Trưởng nhóm
                          </Badge>
                        )}
                        {m.role === "ADMIN" && (
                          <Badge className="bg-[#E5F2FF] text-[#0068FF] border-[#C2E0FF] text-[10px] font-extrabold h-5 px-3 shadow-none hover:bg-[#E5F2FF] uppercase tracking-widest whitespace-nowrap shrink-0 rounded-full">
                            Phó nhóm
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Nút thao tác (Hiện cho Owner hoặc Admin với Member) */}
                    {m.userId !== currentUserId &&
                      (currentMember?.role === "OWNER" ||
                        (currentMember?.role === "ADMIN" &&
                          m.role === "MEMBER")) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {currentMember?.role === "OWNER" && (
                              <>
                                <DropdownMenuItem
                                  className="text-[13px] cursor-pointer"
                                  onClick={() =>
                                    handleUpdateMemberRole(
                                      m,
                                      m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                    )
                                  }
                                >
                                  {m.role === "ADMIN"
                                    ? "Gỡ chức Phó nhóm"
                                    : "Bổ nhiệm Phó nhóm"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[13px] cursor-pointer"
                                  onClick={() => setMemberPendingTransfer(m)}
                                >
                                  Chuyển quyền trưởng nhóm
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 text-[13px] cursor-pointer"
                              onClick={() => setMemberPendingRemove(m)}
                            >
                              Mời ra khỏi nhóm
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </div>
                ))}
                {/* Nút Thêm Thành Viên */}
                {isGroup && canInvite && (
                  <button
                    onClick={() => setAddMemberModalOpen(true)}
                    className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <UserPlus size={18} />
                    </div>
                    <span className="text-[14px] font-medium">
                      Thêm thành viên
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* DANGER ZONE */}
        <div className="bg-white mt-2 border-y mb-6">
          {isGroup && currentMember?.role === "OWNER" && (
            <button
              onClick={() => setDeleteGroupDialogOpen(true)}
              className="h-12 w-full flex items-center px-4 gap-3 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={18} />
              <span className="text-sm font-medium">Giải tán nhóm</span>
            </button>
          )}
          <button
            onClick={() => (isGroup ? setLeaveGroupDialogOpen(true) : null)}
            className="h-12 w-full flex items-center px-4 gap-3 text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50 cursor-pointer"
          >
            {isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
            <span className="text-sm font-medium">
              {isGroup ? "Rời nhóm" : "Xóa lịch sử trò chuyện"}
            </span>
          </button>
        </div>
      </div>

      {/* DIALOGS & MODALS */}
      <CreateGroupModal
        open={addMemberModalOpen}
        onOpenChange={setAddMemberModalOpen}
        mode="ADD_MEMBER"
        conversationId={currentConversation?.conversationId || ""}
        excludeUserIds={members.map((m) => m.userId)}
        onMembersAdded={() => setMembersRefreshKey((k) => k + 1)}
      />

      {/* Image Preview Overlay */}
      {preview.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setPreview({ isOpen: false, index: 0 })}
            className="absolute top-5 right-5 text-white hover:opacity-70 cursor-pointer"
          >
            <CloseIcon size={30} />
          </button>
          <button
            onClick={() => handleDownload(medias[preview.index]?.content?.file)}
            className="absolute top-5 left-5 text-white hover:opacity-70 cursor-pointer"
          >
            <Download size={24} />
          </button>

          {preview.index > 0 && (
            <button
              onClick={() => setPreview((p) => ({ ...p, index: p.index - 1 }))}
              className="absolute left-5 p-2 bg-white/10 rounded-full text-white cursor-pointer hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={30} />
            </button>
          )}
          {preview.index < medias.length - 1 && (
            <button
              onClick={() => setPreview((p) => ({ ...p, index: p.index + 1 }))}
              className="absolute right-5 p-2 bg-white/10 rounded-full text-white cursor-pointer hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={30} />
            </button>
          )}

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
                  className="max-h-[85vh] rounded-lg shadow-2xl"
                />
              ) : (
                <img
                  src={file.fileKey}
                  className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
                  alt=""
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Alert Dialogs (Leave, Delete, Remove, Transfer) */}
      <AlertDialog
        open={leaveGroupDialogOpen}
        onOpenChange={setLeaveGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận rời nhóm</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Bạn sẽ không thể xem lại tin nhắn của nhóm sau khi rời đi.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white min-w-[100px] transition-colors"
              onClick={handleLeaveGroup}
              disabled={isLeavingGroup}
            >
              {isLeavingGroup ? "Đang xử lý..." : "Rời nhóm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Giải tán nhóm?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Tất cả thành viên sẽ bị mời ra khỏi nhóm và tin nhắn sẽ bị xóa vĩnh viễn. Bạn chắc chắn muốn giải tán nhóm?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white min-w-[100px] transition-colors"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? "Đang xử lý..." : "Giải tán"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!memberPendingRemove}
        onOpenChange={() => setMemberPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Bạn có chắc muốn mời {memberPendingRemove?.name} ra khỏi nhóm?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() =>
                memberPendingRemove && handleRemoveMember(memberPendingRemove)
              }
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!memberPendingTransfer}
        onOpenChange={() => setMemberPendingTransfer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển quyền chủ nhóm</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Bạn sẽ trở thành thành viên thường sau khi chuyển quyền cho{" "}
            {memberPendingTransfer?.name}.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() =>
                memberPendingTransfer &&
                handleTransferOwner(memberPendingTransfer)
              }
            >
              Xác nhận
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
          </AlertDialogHeader>
          <AlertDialogDescription>
            Bạn cần chuyển quyền Trưởng nhóm trước khi rời đi.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setLeaveGroupErrorDialogOpen(false)}
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
