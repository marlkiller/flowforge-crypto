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
  Atom,
  Search,
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
  Atom,
  Search,
};

interface Props {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className }: Props) {
  const Icon = iconMap[name] ?? Hash;
  return <Icon className={className} />;
}
