import React, { useRef, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { conversationService } from "@/services/conversation.service";
import { useAppSelector } from "@/store";

interface ShareGroupQRModalProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName: string;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  initialJoinToken: string | null;
  onTokenRefreshed: (newToken: string) => void;
}

const ShareGroupQRModal: React.FC<ShareGroupQRModalProps> = ({
  open,
  onClose,
  conversationId,
  conversationName,
  myRole: roleFromProp,
  initialJoinToken,
  onTokenRefreshed,
}) => {
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const conversation = useAppSelector((state) =>
    state.conversation.conversations.find((c) => c.conversationId === conversationId)
  );

  const token = conversation?.group?.joinToken || initialJoinToken;
  const myRole = roleFromProp || conversation?.myRole || "MEMBER";
  const isManager = myRole === "OWNER" || myRole === "ADMIN";

  useEffect(() => {
    if (open && !token && isManager) {
      handleRefreshToken();
    }
  }, [open, token, isManager]);

  const handleRefreshToken = async () => {
    if (!isManager) return;
    setLoading(true);
    try {
      const res = await conversationService.refreshGroupJoinToken(conversationId);
      if (res.success) {
        onTokenRefreshed(res.joinToken);
        toast.success("Đã làm mới mã QR thành công");
      }
    } catch (error) {
      console.error("Refresh QR error:", error);
      toast.error("Không thể làm mới mã QR (403 Forbidden)");
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("group-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${conversationName.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (!open) return null;

  const qrValue = `zaloclone://group?id=${conversationId}&token=${token}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 animate-in fade-in duration-200 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Mã QR của nhóm</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-6 text-center px-4">
            Quét mã QR này để tham gia nhóm <span className="font-bold text-gray-800">{conversationName}</span>
          </p>

          <div 
            ref={canvasRef}
            className="p-4 bg-white border-4 border-blue-50 rounded-2xl shadow-inner mb-8 relative group"
          >
            {token ? (
              <QRCodeCanvas
                id="group-qr-canvas"
                value={qrValue}
                size={220}
                level="H"
                includeMargin={false}
                imageSettings={{
                    src: "/logo.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                }}
              />
            ) : (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center bg-gray-50 rounded-xl px-6">
                {loading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                ) : (
                  <>
                    <X size={40} className="text-gray-300 mb-3" />
                    <p className="text-xs text-gray-400 text-center">
                      Mã QR chưa được khởi tạo. Vui lòng nhờ Trưởng/Phó nhóm tạo mã.
                    </p>
                  </>
                )}
              </div>
            )}
            
            {loading && token && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          <div className={`grid ${isManager ? "grid-cols-2" : "grid-cols-1"} gap-3 w-full`}>
            {isManager && (
              <Button
                variant="outline"
                className="flex items-center gap-2 h-11 rounded-xl border-gray-200 hover:bg-gray-50 transition-all font-medium text-gray-700"
                onClick={handleRefreshToken}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Tạo mã mới
              </Button>
            )}
            <Button
              className="flex items-center gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-medium shadow-md shadow-blue-100"
              onClick={downloadQR}
              disabled={!token || loading}
            >
              <Download size={18} />
              Tải mã QR
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-0.5">
               <RefreshCw size={14} />
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Mã QR này sẽ giúp mọi người tham gia nhóm ngay lập tức. {isManager ? "Bạn có thể làm mới mã bất cứ lúc nào để vô hiệu hóa mã cũ." : "Chỉ Trưởng/Phó nhóm mới có quyền làm mới mã này."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareGroupQRModal;
