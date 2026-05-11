import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SideBarItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function SideBarItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  className,
}: SideBarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={onClick}
          className={cn(
            "rounded-lg p-3 group relative flex cursor-pointer items-center justify-center transition-all duration-200",
            // Màu nền Zalo khi active
            isActive ? "bg-[#0052cc]" : "hover:bg-white/5",
            className,
          )}
        >
          <Icon
            size={26}
            strokeWidth={2}
            fill="none"
            className={cn(
              "transition-all duration-200 text-white",
            )}
          />
        </div>
      </TooltipTrigger>

      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
