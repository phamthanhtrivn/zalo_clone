import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";
import { pollService } from "@/services/poll.service";

interface Props {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CreatePollModal: React.FC<Props> = ({ conversationId, isOpen, onClose }) => {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hideResultsUntilVoted, setHideResultsUntilVoted] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bình chọn");
      return;
    }

    const filteredOptions = options.filter((opt) => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 phương án");
      return;
    }

    const uniqueOptions = new Set(filteredOptions);
    if (uniqueOptions.size !== filteredOptions.length) {
      toast.error("Các phương án không được trùng nhau");
      return;
    }

    try {
      setIsSubmitting(true);
      await pollService.createPoll(conversationId, {
        title,
        options: filteredOptions,
        isMultipleChoice,
        allowAddOptions,
        isAnonymous,
        hideResultsUntilVoted,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      toast.success("Tạo bình chọn thành công");
      onClose();
      // Reset form
      setTitle("");
      setOptions(["", ""]);
      setIsAnonymous(false);
      setHideResultsUntilVoted(false);
      setExpiresAt("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tạo bình chọn");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-lg">Tạo bình chọn</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Title input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Tiêu đề bình chọn</label>
            <input
              type="text"
              placeholder="Đặt câu hỏi cho nhóm..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Options list */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Các phương án</label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2 group">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={`Phương án ${index + 1}`}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-8"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors cursor-pointer mt-2"
            >
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center">
                <Plus size={14} />
              </div>
              Thêm phương án
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Chọn nhiều phương án</p>
                <p className="text-xs text-gray-500">Người tham gia có thể chọn nhiều hơn 1 phương án</p>
              </div>
              <Switch
                checked={isMultipleChoice}
                onCheckedChange={setIsMultipleChoice}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Cho phép thêm phương án</p>
                <p className="text-xs text-gray-500">Mọi người đều có thể thêm phương án mới</p>
              </div>
              <Switch
                checked={allowAddOptions}
                onCheckedChange={setAllowAddOptions}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-semibold text-gray-700">Bình chọn ẩn danh</p>
                <p className="text-xs text-gray-500">Không ai xem được người bình chọn</p>
              </div>
              <Switch
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-semibold text-gray-700">Ẩn kết quả</p>
                <p className="text-xs text-gray-500">Chỉ hiện kết quả sau khi đã bình chọn</p>
              </div>
              <Switch
                checked={hideResultsUntilVoted}
                onCheckedChange={setHideResultsUntilVoted}
              />
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-sm font-semibold text-gray-700">Thời hạn kết thúc</p>
              <input 
                type="datetime-local" 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang tạo..." : "Tạo bình chọn"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePollModal;
