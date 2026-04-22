import { ChevronRight } from "lucide-react";

type SettingChooseItemType = React.ComponentProps<"div"> & {
  title?: string;
  onClick?: () => void;
  rightSection?: React.ReactNode;
};

export default function SettingChooseItem({
  onClick,
  children,
  rightSection,
  className,
}: SettingChooseItemType) {
  return (
    <button
      className={`flex justify-between ${className} items-center hover:cursor-pointer w-full p-4 border-b-[0.5px]`}
      onClick={onClick}
    >
      {children}
      {/* right section */}
      <div>
        {rightSection ? rightSection : <ChevronRight size={20} color="gray" />}
      </div>
    </button>
  );
}
