import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";

interface NestedViewLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const NestedViewLayout: React.FC<NestedViewLayoutProps> = ({
  title,
  onBack,
  children,
}) => {
  // Logic animation được đóng gói hoàn toàn vào đây
  const [leaving, setLeaving] = useState(false);

  const handleBack = () => {
    setLeaving(true);
    setTimeout(() => {
      onBack();
    }, 200); // Khớp với class duration-200 của Tailwind
  };

  return (
    <div
      className={`flex flex-col h-full duration-200 ${
        leaving
          ? "animate-out slide-out-to-right-4"
          : "animate-in slide-in-from-right-4"
      }`}
    >
      {/* HEADER chung */}
      <div className="flex items-center gap-3 mb-6  border-b border-gray-100">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors hover:cursor-pointer"
        >
          <ChevronLeft size={25} color="gray" />
        </button>
        <h2 className="font-medium text-gray-800">{title}</h2>
      </div>

      {/* BODY nội dung */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  );
};
