import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
            "group relative flex  w-full cursor-pointer items-center justify-center transition-all duration-200",
            // Hiệu ứng background khi hover hoặc active
            isActive ? "bg-blue-700" : "hover:bg-blue-800/50",
            className,
          )}
        >
          {/* Icon chính */}
          <Icon
            size={24}
            strokeWidth={1.5}
            className={cn(
              "transition-colors",
              isActive ? "text-white" : "text-blue-100 group-hover:text-white",
            )}
          />

          {/* Vạch trắng nhỏ bên cạnh khi Active (giống Zalo gốc) */}
          {isActive && (
            <div className="absolute left-0 h-full w-[3px] bg-white" />
          )}
        </div>
      </TooltipTrigger>

      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
