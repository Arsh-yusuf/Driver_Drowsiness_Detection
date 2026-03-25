import { AlertSeverity } from "@/data/mockAlerts";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

const config: Record<AlertSeverity, { label: string; className: string; icon: React.ElementType }> = {
  critical: {
    label: "Critical",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertOctagon,
  },
  warning: {
    label: "Warning",
    className: "bg-warning/15 text-warning border-warning/30",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    className: "bg-muted text-muted-foreground border-border",
    icon: Info,
  },
};

const SeverityBadge = ({ severity }: SeverityBadgeProps) => {
  const { label, className, icon: Icon } = config[severity];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

export default SeverityBadge;
