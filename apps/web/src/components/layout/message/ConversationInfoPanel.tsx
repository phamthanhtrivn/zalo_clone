import { useState, useEffect, useRef } from "react";
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
import {
  removeConversation,
  updateConversationSetting,
} from "@/store/slices/conversationSlice";
import {
  pinConversation,
  unpinConversation,
  muteConversation,
  unmuteConversation,
} from "@/services/conversation-settings.service";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
} from "@floating-ui/react";

// --- TYPES & CONSTANTS ---
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
  currentUser?: { _id: string };
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

  // Select conversation from store to get real-time Pin/Mute status
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
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

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

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!isOpen || !currentConversation?.conversationId || !currentUserId)
      return;
    const fetchMediaPreview = async () => {
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
        console.error(error);
      }
    };
    fetchMediaPreview();
  }, [isOpen, currentConversation?.conversationId, currentUserId]);

  useEffect(() => {
    if (!isOpen || !isGroup || !currentConversation?.conversationId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    const loadMembers = async () => {
      setMembersLoading(true);
      try {
        const res = await conversationService.getListMembers(
          currentConversation.conversationId,
        );
        if (!cancelled && res?.success && Array.isArray(res.data))
          setMembers(res.data as ConversationMemberRow[]);
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
  }, [isOpen, isGroup, currentConversation?.conversationId, membersRefreshKey]);

  // --- ACTIONS ---
  const handlePin = async () => {
    if (!currentConversation) return;
    const newPinned = !isPinned;
    dispatch(
      updateConversationSetting({
        conversationId: currentConversation.conversationId,
        pinned: newPinned,
      }),
    );
    try {
      newPinned
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
          pinned: !newPinned,
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
    } else if (duration > 0)
      mutedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();

    const newMuted = duration !== 0;
    dispatch(
      updateConversationSetting({
        conversationId: currentConversation.conversationId,
        muted: newMuted,
        mutedUntil,
      }),
    );
    try {
      duration === 0
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
          muted: !newMuted,
          mutedUntil: currentConversation.mutedUntil ?? null,
        }),
      );
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
        setMembersRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error(error);
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
    } catch (err) {
      setLeaveGroupErrorDialogOpen(true);
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return <div className="w-0 overflow-hidden" />;

  const currentMember = members.find(
    (m) => String(m.userId) === String(currentUserId),
  );
  const canManage =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  return (
    <div className="w-[320px] h-full bg-[#f7f8fa] border-l flex flex-col">
      <div className="h-14 bg-white flex items-center justify-between px-4 border-b shrink-0">
        <h2 className="text-[15px] font-medium">Thông tin hội thoại</h2>
        {onClose && (
          <X
            size={18}
            className="text-gray-500 cursor-pointer"
            onClick={onClose}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="bg-white flex flex-col items-center py-5">
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={currentConversation?.avatar} />
            <AvatarFallback>
              {currentConversation?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-[15px] font-medium px-3 text-center">
            {currentConversation?.name}
          </h3>
        </div>

        {/* Quick Actions */}
        <div className="bg-white py-3 flex items-start px-8 gap-2">
          <div className="flex-1 flex flex-col items-center">
            <button
              ref={refs.setReference}
              onClick={() =>
                isMuted ? handleMute(0) : setShowMuteOptions(!showMuteOptions)
              }
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${isMuted ? "bg-blue-100" : "bg-gray-100"}`}
              >
                {isMuted ? (
                  <BellOff size={18} className="text-[#0068ff]" />
                ) : (
                  <Bell size={18} className="text-gray-600" />
                )}
              </div>
              <span className="text-[11px]">
                {isMuted ? "Đang tắt" : "Tắt thông báo"}
              </span>
            </button>
            {showMuteOptions && (
              <FloatingPortal>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setShowMuteOptions(false)}
                />
                <div
                  ref={refs.setFloating}
                  style={floatingStyles}
                  className="z-[9999] w-52 bg-white rounded-xl shadow-xl border text-sm overflow-hidden"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b bg-gray-50">
                    Tắt thông báo trong
                  </div>
                  {MUTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleMute(opt.duration)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FloatingPortal>
            )}
          </div>

          <button
            onClick={handlePin}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${isPinned ? "bg-blue-100" : "bg-gray-100"}`}
            >
              {isPinned ? (
                <PinOff size={18} className="text-[#0068ff]" />
              ) : (
                <Pin size={18} className="text-gray-600" />
              )}
            </div>
            <span className="text-[11px]">
              {isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
            </span>
          </button>

          <button
            onClick={() => isGroup && setAddMemberModalOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isGroup ? <UserPlus size={18} /> : <Users size={18} />}
            </div>
            <span className="text-[11px]">
              {isGroup ? "Thêm bạn" : "Tạo nhóm"}
            </span>
          </button>
        </div>

        {/* Media Section */}
        <div className="bg-white mt-2 border-t">
          <button
            onClick={() => toggleSection("media")}
            className="h-12 w-full flex items-center justify-between px-4"
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
                <div className="grid grid-cols-3 gap-1">
                  {medias.slice(0, 6).map((m, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer"
                      onClick={() => setPreview({ isOpen: true, index: i })}
                    >
                      <img
                        src={m?.content?.file?.fileKey}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có ảnh/video
                </p>
              )}
            </div>
          )}
        </div>

        {/* Members Section */}
        {isGroup && (
          <div className="bg-white mt-2 border-t">
            <button
              onClick={() => toggleSection("members")}
              className="h-12 w-full flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span className="text-[14px] font-medium">
                  Thành viên ({members.length})
                </span>
              </div>
              {expandedSections.members ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {expandedSections.members && (
              <div className="px-2 pb-3">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={m.avatarUrl ?? ""} />
                      <AvatarFallback>{m.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {m.name}{" "}
                        {m.role !== "MEMBER" && (
                          <span className="text-[10px] bg-gray-100 px-1 rounded ml-1">
                            {m.role}
                          </span>
                        )}
                      </p>
                    </div>
                    {canManage && m.userId !== currentUserId && (
                      <button
                        onClick={() => setMemberPendingRemove(m)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-white mt-2 border-t">
          {isGroup && currentMember?.role === "OWNER" && (
            <button
              onClick={() => setDeleteGroupDialogOpen(true)}
              className="h-12 w-full flex items-center px-4 gap-3 text-red-500 border-b"
            >
              <Trash2 size={18} />
              <span>Giải tán nhóm</span>
            </button>
          )}
          <button
            onClick={() => (isGroup ? setLeaveGroupDialogOpen(true) : null)}
            className="h-12 w-full flex items-center px-4 gap-3 text-red-500"
          >
            {isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
            <span>{isGroup ? "Rời nhóm" : "Xóa lịch sử"}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AlertDialog
        open={leaveGroupDialogOpen}
        onOpenChange={setLeaveGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ không thể xem lại tin nhắn sau khi rời đi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-red-500"
            >
              Rời nhóm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addMemberModalOpen && (
        <CreateGroupModal
          open={addMemberModalOpen}
          onOpenChange={setAddMemberModalOpen}
          mode="ADD_MEMBER"
          conversationId={currentConversation!.conversationId}
          excludeUserIds={members.map((m) => m.userId)}
          onMembersAdded={() => setMembersRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default ConversationInfoPanel;
