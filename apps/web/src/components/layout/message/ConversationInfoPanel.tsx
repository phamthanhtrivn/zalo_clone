import { useState, useEffect } from "react";
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
  Link2,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  X as CloseIcon,
  Download,
  ChevronLeft,
  ShieldCheck,
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
  FloatingPortal,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Types & Utils
import type { ConversationItemType } from "@/types/conversation-item.type";
import { getFileIcon } from "@/utils/file-icon.util";
import { getDateLabel } from "@/utils/format-message-time..util";

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

  // --- SOCKET LISTENERS ---
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

  useEffect(() => {
    if (!socket) return;
    socket.on("member_updated", () => {
      setMembersRefreshKey((k) => k + 1);
    });
    return () => {
      socket.off("member_updated");
    };
  }, [socket]);

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
            conversationId: currentConversation.conversationId,
            group: { ...currentConversation.group, [key]: value },
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
          muted: isMuted,
          mutedUntil: currentConversation.mutedUntil ?? null,
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
      if (res?.success) setMembersRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
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
      navigate("/");
    } catch {
      setLeaveGroupErrorDialogOpen(true);
    } finally {
      setIsLeavingGroup(false);
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
        navigate("/");
      }
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600 font-bold">
                {currentConversation?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isGroup && canManageMembers && (
              <div className="absolute bottom-3 right-0 p-1.5 bg-white rounded-full shadow-lg border cursor-pointer hover:bg-gray-50">
                <Pencil size={12} className="text-gray-600" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-4 text-center">
            <h3 className="text-[17px] font-bold text-gray-900 leading-tight">
              {currentConversation?.name}
            </h3>
            {isGroup && canManageMembers && (
              <Pencil
                size={14}
                className="text-gray-400 cursor-pointer hover:text-blue-600"
              />
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
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"}`}
              >
                {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
              </div>
              <span className="text-[11px] font-medium text-gray-600">
                Thông báo
              </span>
            </button>
          </div>

          {/* Pin Button */}
          <button
            onClick={handlePin}
            className="flex flex-col items-center gap-1.5 flex-1 group"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPinned ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"}`}
            >
              {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
            </div>
            <span className="text-[11px] font-medium text-gray-600">Ghim</span>
          </button>

          {/* Add Member / Create Group Button */}
          {isGroup ? (
            // NẾU LÀ NHÓM: Kiểm tra quyền mời mới hiện nút Thêm TV
            canInvite && (
              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="flex flex-col items-center gap-1.5 flex-1 group animate-in fade-in zoom-in duration-200"
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
            // NẾU LÀ CHAT 1-1: Luôn hiện nút Tạo nhóm
            <button
              onClick={() => {
                // Logic: Mở modal tạo nhóm mới
                // Ở đây có thể gọi CreateGroupModal với mode="CREATE_GROUP"
                // và truyền sẵn otherMemberId vào list chọn mặc định (nếu muốn)
                setAddMemberModalOpen(true);
              }}
              className="flex flex-col items-center gap-1.5 flex-1 group animate-in fade-in zoom-in duration-200"
            >
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <Users size={20} />
              </div>
              <span className="text-[11px] font-medium text-gray-600">
                Tạo nhóm
              </span>
            </button>
          )}
        </div>

        {/* SECTION: PHÊ DUYỆT THÀNH VIÊN (Hiện khi có request) */}
        {isGroup && canManageMembers && joinRequests.length > 0 && (
          <div className="bg-white mt-2 border-y border-blue-100 shadow-sm">
            <button
              onClick={() => toggleSection("requests")}
              className="h-12 w-full flex items-center justify-between px-4"
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
                        className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => onHandleRequest(req._id, "reject")}
                        className="p-1.5 bg-white text-gray-400 border rounded-full hover:bg-gray-50 shadow-sm"
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
              className="h-12 w-full flex items-center justify-between px-4 hover:bg-gray-50 transition-colors"
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
                    } // Mặc định true
                    onCheckedChange={(val) =>
                      handleUpdateSetting("allowMembersInvite", val)
                    }
                  />
                </div>

                {/* 2. QUYỀN GỬI TIN NHẮN (MỚI THÊM) */}
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
                    } // Mặc định true
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
                    } // Mặc định false
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
            className="h-12 w-full flex items-center justify-between px-4"
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
                  {medias.slice(0, 6).map((m, idx) => (
                    <div
                      key={idx}
                      className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer relative"
                      onClick={() => setPreview({ isOpen: true, index: idx })}
                    >
                      <img
                        src={m?.content?.file?.fileKey}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                      {m?.content?.file?.type === "VIDEO" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                            <div className="ml-0.5 border-l-[6px] border-l-white border-y-[4px] border-y-transparent" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có ảnh/video
                </p>
              )}
              {medias.length > 0 && (
                <Button variant="secondary" className="w-full mt-3 h-8 text-xs">
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
            className="h-12 w-full flex items-center justify-between px-4"
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
            <div className="px-4 pb-4 space-y-2">
              {files.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group"
                >
                  <div className="shrink-0">
                    {getFileIcon(item.content.file.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.content.file.fileName}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {(item.content.file.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(item.content.file)}
                    className="p-1.5 hover:bg-white rounded border opacity-0 group-hover:opacity-100"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có file
                </p>
              )}
            </div>
          )}
        </div>

        {/* MEMBERS SECTION */}
        {isGroup && (
          <div className="bg-white border-t">
            <button
              onClick={() => toggleSection("members")}
              className="h-12 w-full flex items-center justify-between px-4 hover:bg-gray-50 transition-colors"
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
                    <Avatar className="w-10 h-10 border">
                      <AvatarImage src={m.avatarUrl ?? ""} />
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {m.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-gray-800 truncate">
                          {m.name}
                          {String(m.userId) === String(currentUserId) &&
                            " (Bạn)"}
                        </span>
                        {m.role === "OWNER" && (
                          <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[9px] h-4 px-1.5 shadow-none hover:bg-orange-50">
                            Trưởng nhóm
                          </Badge>
                        )}
                        {m.role === "ADMIN" && (
                          <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] h-4 px-1.5 shadow-none hover:bg-blue-50">
                            Phó nhóm
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Nút thao tác (Chỉ hiện cho Owner với người khác) */}
                    {currentMember?.role === "OWNER" &&
                      m.userId !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="text-[13px]"
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
                              className="text-[13px]"
                              onClick={() => setMemberPendingTransfer(m)}
                            >
                              Chuyển trưởng nhóm
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 text-[13px]"
                              onClick={() => setMemberPendingRemove(m)}
                            >
                              Mời ra khỏi nhóm
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </div>
                ))}

                {/* Nút Xem thêm nếu cần */}
                {isGroup && canInvite && (
                  <button
                    onClick={() => setAddMemberModalOpen(true)}
                    className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
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
              className="h-12 w-full flex items-center px-4 gap-3 text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
              <span className="text-sm font-medium">Giải tán nhóm</span>
            </button>
          )}
          <button
            onClick={() => (isGroup ? setLeaveGroupDialogOpen(true) : null)}
            className="h-12 w-full flex items-center px-4 gap-3 text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50"
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
            className="absolute top-5 right-5 text-white"
          >
            <CloseIcon size={30} />
          </button>
          <button
            onClick={() => handleDownload(medias[preview.index].content.file)}
            className="absolute top-5 left-5 text-white"
          >
            <Download size={24} />
          </button>

          {preview.index > 0 && (
            <button
              onClick={() => setPreview((p) => ({ ...p, index: p.index - 1 }))}
              className="absolute left-5 p-2 bg-white/10 rounded-full text-white"
            >
              <ChevronLeft size={30} />
            </button>
          )}
          {preview.index < medias.length - 1 && (
            <button
              onClick={() => setPreview((p) => ({ ...p, index: p.index + 1 }))}
              className="absolute right-5 p-2 bg-white/10 rounded-full text-white"
            >
              <ChevronRight size={30} />
            </button>
          )}

          <div className="max-w-[85%] max-h-[85%]">
            {medias[preview.index].content.file.type === "VIDEO" ? (
              <video
                src={medias[preview.index].content.file.fileKey}
                controls
                autoPlay
                className="max-h-[80vh]"
              />
            ) : (
              <img
                src={medias[preview.index].content.file.fileKey}
                className="max-h-[80vh] object-contain"
                alt=""
              />
            )}
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
              className="bg-red-500 hover:bg-red-600"
              onClick={handleLeaveGroup}
              disabled={isLeavingGroup}
            >
              Rời nhóm
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
            Tất cả thành viên sẽ bị mời ra khỏi nhóm và tin nhắn sẽ bị xóa vĩnh
            viễn.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
            >
              Giải tán
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
            {leaveGroupErrorMessage}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction
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
