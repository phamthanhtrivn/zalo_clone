import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, UserPlus, Pin, PinOff,
  Image as ImageIcon, FileText, Link as LinkIcon,
  Users, Link2, LogOut, Trash2, ChevronDown,
  ChevronRight, X, Download, ChevronLeft,
} from "lucide-react";
import { messageService } from "@/services/message.service";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { getFileIcon } from "@/utils/file-icon.util";
import { getDateLabel } from "@/utils/format-message-time..util";
import { saveAs } from "file-saver";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateConversationSetting } from "@/store/slices/conversationSlice";
import {
  pinConversation, unpinConversation,
  muteConversation, unmuteConversation,
} from "@/services/conversation-settings.service";
import {
  useFloating, offset, flip, shift,
  autoUpdate, FloatingPortal,
} from "@floating-ui/react";
import { useSocket } from "@/contexts/SocketContext";

interface ConversationInfoPanelProps {
  isOpen: boolean;
  conversation: ConversationItemType | null;
  onClose?: () => void;
}

const MUTE_OPTIONS = [
  { label: "Trong 1 giờ", duration: 60 },
  { label: "Trong 4 giờ", duration: 240 },
  { label: "Cho đến 8:00 AM", duration: -2 },
  { label: "Cho đến khi mở lại", duration: -1 },
];

const ConversationInfoPanel = ({ isOpen, conversation, onClose }: ConversationInfoPanelProps) => {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const currentConversation = useAppSelector((state) =>
    conversation?.conversationId
      ? state.conversation.conversations.find(
        (c) => c.conversationId === conversation.conversationId
      ) ?? conversation
      : null
  );

  const isPinned = currentConversation?.pinned ?? false;
  const isMuted =
    !!currentConversation?.muted &&
    (
      !currentConversation?.mutedUntil ||
      currentConversation.mutedUntil === "infinite" ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now()
    );

  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    media: true, file: false, link: false,
  });
  const [preview, setPreview] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false, index: 0,
  });

  const isGroup = currentConversation?.type === "GROUP";

  useEffect(() => {
    if (!isOpen || !currentConversation?.conversationId || !user?.userId) return;
    const fetchMediaPreview = async () => {
      try {
        const res = await messageService.getMediasPreview(
          user.userId,
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
  }, [isOpen, currentConversation?.conversationId, user?.userId]);

  const handlePin = async () => {
    if (!currentConversation) return;
    const newPinned = !isPinned;
    dispatch(updateConversationSetting({ conversationId: currentConversation.conversationId, pinned: newPinned }));
    try {
      newPinned
        ? await pinConversation(user?.userId, currentConversation.conversationId)
        : await unpinConversation(user?.userId, currentConversation.conversationId);
    } catch {
      dispatch(updateConversationSetting({ conversationId: currentConversation.conversationId, pinned: !newPinned }));
    }
  };

  const handleMute = async (duration: number) => {
    if (!currentConversation) return;
    setShowMuteOptions(false);

    let mutedUntil: string | null = null;
    if (duration === 0) mutedUntil = null;
    else if (duration === -1) mutedUntil = "infinite";
    else if (duration === -2) {
      const next8AM = new Date();
      if (next8AM.getHours() >= 8) next8AM.setDate(next8AM.getDate() + 1);
      next8AM.setHours(8, 0, 0, 0);
      mutedUntil = next8AM.toISOString();
    } else {
      mutedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    const newMuted = duration !== 0;
    const prevMuted = currentConversation.muted;
    const prevMutedUntil = currentConversation.mutedUntil;

    dispatch(updateConversationSetting({ conversationId: currentConversation.conversationId, muted: newMuted, mutedUntil }));
    try {
      duration === 0
        ? await unmuteConversation(user?.userId, currentConversation.conversationId)
        : await muteConversation(user?.userId, currentConversation.conversationId, duration);
    } catch {
      dispatch(updateConversationSetting({ conversationId: currentConversation.conversationId, muted: prevMuted, mutedUntil: prevMutedUntil ?? null }));
    }
  };

  const toggleSection = (section: "media" | "file" | "link") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!preview.isOpen) return;
      if (e.key === "Escape") setPreview({ isOpen: false, index: 0 });
      if (e.key === "ArrowRight") setPreview((p) => ({ ...p, index: Math.min(p.index + 1, medias.length - 1) }));
      if (e.key === "ArrowLeft") setPreview((p) => ({ ...p, index: Math.max(p.index - 1, 0) }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview.isOpen, medias.length]);

  useEffect(() => {
    if (!socket) return;

    const handleMediasUpdated = (data: { type: string; data: any }) => {
      if (data.type === "IMAGE_VIDEO") {
        setMedias((prev) => [data.data, ...prev].slice(0, 6));
      }

      if (data.type === "FILE") {
        setFiles((prev) => [data.data, ...prev].slice(0, 6));
      }

      if (data.type === "LINK") {
        setLinks((prev) => [data.data, ...prev].slice(0, 6));
      }
    };

    socket.on("new_media_preview", handleMediasUpdated);

    return () => {
      socket.off("new_media_preview", handleMediasUpdated);
    };
  }, [socket, conversation?.conversationId]);

  if (!isOpen) return <div className="w-0 overflow-hidden" />;

  return (
    <div className="w-[320px] h-full bg-[#f7f8fa] border-l flex flex-col">
      <div className="h-14 bg-white flex items-center justify-between px-4 border-b shrink-0">
        <h2 className="text-[15px] font-medium text-gray-800">Thông tin hội thoại</h2>
        {onClose && <X size={18} className="text-gray-500 cursor-pointer" onClick={onClose} />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white flex flex-col items-center py-5">
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={currentConversation?.avatar} />
            <AvatarFallback>{currentConversation?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h3 className="text-[15px] font-medium text-gray-900 text-center px-3">
            {currentConversation?.name}
          </h3>
        </div>

        <div className="bg-white py-3 flex items-start px-10">

          <div className="flex-1 flex flex-col items-center gap-1">
            <button
              ref={refs.setReference}
              onClick={() => isMuted ? handleMute(0) : setShowMuteOptions((v) => !v)}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isMuted ? "bg-blue-100" : "bg-gray-100"}`}>
                {isMuted
                  ? <BellOff size={18} className="text-[#0068ff]" />
                  : <Bell size={18} className="text-gray-600" />
                }
              </div>
              <span className={`text-[11px] text-center leading-tight max-w-[70px] ${isMuted ? "text-[#0068ff]" : "text-gray-600"}`}>
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
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700"
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
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isPinned ? "bg-blue-100" : "bg-gray-100"}`}>
              {isPinned
                ? <PinOff size={18} className="text-[#0068ff]" />
                : <Pin size={18} className="text-gray-600" />
              }
            </div>
            <span className={`text-[11px] text-center leading-tight max-w-[70px] ${isPinned ? "text-[#0068ff]" : "text-gray-600"}`}>
              {isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
            </span>
          </button>

          <button className="flex-1 flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isGroup ? <UserPlus size={18} /> : <Users size={18} />}
            </div>
            <span className="text-[11px] text-gray-600 text-center leading-tight max-w-[70px]">
              {isGroup ? "Thêm thành viên" : "Tạo nhóm"}
            </span>
          </button>
        </div>

        <div className="bg-white mt-2">
          <button onClick={() => toggleSection("media")} className="h-12 w-full flex items-center justify-between px-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <ImageIcon size={18} />
              <span className="text-[14px] font-medium">Ảnh/Video</span>
            </div>
            {expandedSections.media ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.media && (
            <div className="px-4 pb-4">
              {medias.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5">
                  {medias.slice(0, 6).map((media, idx) => {
                    const file = media?.content?.file;
                    const isVideo = file?.type === "VIDEO";
                    return (
                      <div key={idx} className="aspect-square bg-gray-100 overflow-hidden relative cursor-pointer" onClick={() => setPreview({ isOpen: true, index: idx })}>
                        {isVideo ? (
                          <>
                            <video src={file?.fileKey} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="ml-1 border-l-8 border-l-white border-y-6 border-y-transparent" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img src={file?.fileKey} className="w-full h-full object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Chưa có ảnh/video trong cuộc trò chuyện</p>
              )}
              <Button className="w-full bg-gray-200 mt-3 text-black cursor-pointer hover:bg-gray-300">Xem tất cả</Button>
            </div>
          )}
        </div>

        <div className="bg-white mt-0.5">
          <button onClick={() => toggleSection("file")} className="h-12 w-full flex items-center justify-between px-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <FileText size={18} />
              <span className="text-[14px] font-medium">File</span>
            </div>
            {expandedSections.file ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.file && (
            <div className="px-4 pb-4">
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.slice(0, 6).map((item, idx) => {
                    const file = item.content?.file;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-white hover:bg-gray-50 rounded-lg border transition">
                        <div className="shrink-0">{getFileIcon(file.fileName)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{file.fileName}</p>
                          <p className="text-[11px] text-gray-500">{getDateLabel(item.createdAt)} • {(file.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => handleDownload(file)} className="p-1 border rounded-md hover:bg-gray-100 cursor-pointer">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Chưa có file trong cuộc trò chuyện</p>
              )}
              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">Xem tất cả</Button>
            </div>
          )}
        </div>

        <div className="bg-white mt-0.5">
          <button onClick={() => toggleSection("link")} className="h-12 w-full flex items-center justify-between px-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <LinkIcon size={18} />
              <span className="text-[14px] font-medium">Link</span>
            </div>
            {expandedSections.link ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.link && (
            <div className="px-4 pb-4 space-y-2">
              {links.length > 0 ? (
                links.slice(0, 6).map((item, idx) => {
                  const url = item.content?.text;
                  const getDomain = (url: string) => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } };
                  return (
                    <a key={idx} href={url} target="_blank" className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 transition">
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md shrink-0"><LinkIcon size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#0068ff] truncate">{url}</p>
                        <p className="text-[11px] text-gray-500 truncate">{getDomain(url)}</p>
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0">{getDateLabel(item.createdAt)}</div>
                    </a>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Chưa có link trong cuộc trò chuyện</p>
              )}
              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">Xem tất cả</Button>
            </div>
          )}
        </div>

        {isGroup && (
          <div className="bg-white mt-2">
            <button className="h-12 w-full flex items-center px-4 gap-3"><Users size={18} /><span className="text-[14px]">Thành viên</span></button>
            <button className="h-12 w-full flex items-center px-4 gap-3 border-t"><Link2 size={18} /><span className="text-[14px]">Link nhóm</span></button>
          </div>
        )}

        <div className="bg-white mt-2">
          <button className="h-12 w-full flex items-center px-4 gap-3 text-red-500 cursor-pointer border-t">
            {isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
            <span className="text-[14px]">{isGroup ? "Rời nhóm" : "Xóa lịch sử"}</span>
          </button>
        </div>
      </div>

      {preview.isOpen && (
        <div className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center">
          <button onClick={() => setPreview({ isOpen: false, index: 0 })} className="absolute top-5 right-5 text-white hover:opacity-70 cursor-pointer"><X size={28} /></button>
          <button onClick={() => handleDownload(medias[preview.index]?.content?.file)} className="absolute top-5 left-5 text-white hover:opacity-70 cursor-pointer"><Download size={24} /></button>
          {preview.index > 0 && (
            <button onClick={() => setPreview((p) => ({ ...p, index: p.index - 1 }))} className="absolute left-5 text-white bg-black/50 p-2 rounded-full cursor-pointer"><ChevronLeft size={28} /></button>
          )}
          {preview.index < medias.length - 1 && (
            <button onClick={() => setPreview((p) => ({ ...p, index: p.index + 1 }))} className="absolute right-5 text-white bg-black/50 p-2 rounded-full cursor-pointer"><ChevronRight size={28} /></button>
          )}
          <div className="max-w-[90%] max-h-[90%]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const file = medias[preview.index]?.content?.file;
              if (!file) return null;
              return file.type === "VIDEO"
                ? <video src={file.fileKey} controls autoPlay className="max-h-[85vh] rounded-lg" />
                : <img src={file.fileKey} className="max-h-[85vh] rounded-lg object-contain" />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationInfoPanel;