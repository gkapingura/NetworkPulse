import { cn } from "@/lib/utils";
import { DeviceStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: DeviceStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";

  const statusClasses = {
    online: "bg-success bg-opacity-10 text-success",
    offline: "bg-danger bg-opacity-10 text-danger",
    warning: "bg-warning bg-opacity-10 text-warning"
  };

  const statusLabels = {
    online: "Online",
    offline: "Offline",
    warning: "Warning"
  };

  return (
    <span className={cn(baseClasses, statusClasses[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
