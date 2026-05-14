import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
};

const ConversationPinDialog = ({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  loading = false,
  onClose,
  onSubmit,
}: Props) => {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!open) {
      setPin("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h3 className="text-[18px] font-semibold text-[#111827]">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-500 hover:text-gray-700 cursor-pointer"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">
          {description ? (
            <p className="text-[14px] leading-6 text-[#6b7280]">{description}</p>
          ) : null}

          <input
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            placeholder="••••"
            className="mt-5 w-full rounded-2xl border border-[#d1d5db] px-4 py-4 text-center text-[28px] tracking-[14px] text-[#111827] outline-none focus:border-[#0068ff]"
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-[#f3f4f6] px-5 py-3 text-[15px] font-semibold text-[#374151] hover:bg-[#e5e7eb] cursor-pointer"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              onClick={() => onSubmit(pin)}
              disabled={pin.length !== 4 || loading}
              className="min-w-[112px] rounded-xl bg-[#0068ff] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#0057d8] disabled:cursor-not-allowed disabled:bg-[#93c5fd] cursor-pointer"
            >
              {loading ? "Đang xử lý..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationPinDialog;
