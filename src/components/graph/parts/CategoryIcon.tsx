import {
  Terminal,
  Type,
  RefreshCw,
  Hash,
  Lock,
  Key,
  ShieldCheck,
  Wand,
  Shuffle,
  Globe,
  Archive,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Terminal,
  Type,
  RefreshCw,
  Hash,
  Lock,
  Key,
  ShieldCheck,
  Wand,
  Shuffle,
  Globe,
  Archive,
};

interface Props {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className }: Props) {
  const Icon = iconMap[name] ?? Hash;
  return <Icon className={className} />;
}
