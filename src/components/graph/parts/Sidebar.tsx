import {
  ChevronDown,
  ChevronRight,
  Github,
  GripVertical,
  Download,
  Upload,
  Share2,
  Trash2,
  Plug,
  LayoutTemplate,
  Fingerprint,
  ShieldCheck,
  FileKey,
  Hash,
  KeyRound,
  ScanFace,
  Telescope,
  Atom,
  Search,
  Network,
  Split,
} from "lucide-react";
import { getActiveCategories, CATEGORY_META, NODE_KIND_META } from "@/lib/crypto/registry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CategoryIcon } from "./CategoryIcon";
import { graphStore } from "../store";
import { ALL_PRESETS } from "@/presets/presets";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const PRESET_ICONS: Record<string, typeof Fingerprint> = {
  "RSA Signing Flow": Fingerprint,
  "AES-GCM Encrypt/Decrypt": ShieldCheck,
  "AES-CBC Encrypt/Decrypt": ShieldCheck,
  "ChaCha20-Poly1305 Encrypt/Decrypt": ShieldCheck,
  "ECDSA Sign & Verify": Telescope,
  "Ed25519 Sign & Verify": Telescope,
  "JWT Sign & Verify": FileKey,
  "HMAC Sign & Verify": KeyRound,
  "Hash Suite (4 algorithms)": Hash,
  "KDF (PBKDF2) + AES": KeyRound,
  "Argon2 (Password Hash)": KeyRound,
  "TOTP Authenticator": ScanFace,
  "ML-KEM Encapsulation": Atom,
  "ML-DSA Sign & Verify": Atom,
  "SLH-DSA Sign & Verify": Atom,
  "secp256k1 Sign & Verify": Telescope,
  "secp256k1 ECDH Key Exchange": KeyRound,
  "Ed448 Sign & Verify": Telescope,
  "X448 Key Exchange": KeyRound,
  "BLS12-381 Sign & Verify": Network,
  "Diffie-Hellman Key Exchange": KeyRound,
  "Frequency Analysis": Search,
  "ECB Block Detection": Search,
  "Shamir Split & Join": Split,
  "X.509 Certificate Parse": FileKey,
  "PEM to JWK Conversion": FileKey,
  "SSH Key Parse": FileKey,
};

function TemplateMenuButton() {
  const [query, setQuery] = useState("");
  const filtered = query
    ? ALL_PRESETS.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.toLowerCase().includes(query.toLowerCase()),
      )
    : ALL_PRESETS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all">
          <LayoutTemplate className="w-3 h-3" /> Templates
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <div className="px-2 pt-2 pb-1">
          <input
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-[10px] opacity-40">No templates found</div>
          ) : (
            filtered.map((p) => {
              const Icon = PRESET_ICONS[p.label] ?? LayoutTemplate;
              return (
                <DropdownMenuItem
                  key={p.label}
                  onClick={() => graphStore.setActiveGraph(p.seed)}
                  className="text-[11px] cursor-pointer gap-2"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {p.label}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SidebarProps {
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  setPluginDialogOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  collapsedCats: Set<string>;
  toggleCat: (cat: string) => void;
  onDragStart: (e: React.DragEvent, kind: string) => void;
  openExportDialog: () => void;
  openShareDialog: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function Sidebar({
  leftPanelOpen,
  setLeftPanelOpen,
  setPluginDialogOpen,
  searchQuery,
  setSearchQuery,
  collapsedCats,
  toggleCat,
  onDragStart,
  openExportDialog,
  openShareDialog,
  fileInputRef,
}: SidebarProps) {
  return (
    <aside
      className={`bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${leftPanelOpen ? "w-66" : "w-8"}`}
    >
      {/* Header — always visible */}
      <div
        className={`flex items-center h-8 shrink-0 border-b border-border ${leftPanelOpen ? "gap-2 px-3 min-w-66" : "px-1 justify-center"}`}
      >
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
          aria-label={leftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${leftPanelOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {leftPanelOpen && (
          <>
            <h1 className="text-xs font-semibold text-foreground truncate min-w-0">
              FlowForge Crypto
            </h1>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setPluginDialogOpen(true)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all group"
                title="Plugin Manager"
                aria-label="Plugin Manager"
              >
                <Plug className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </button>
              <a
                href="https://github.com/marlkiller/flowforge-crypto"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="View on GitHub"
                aria-label="View on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <ThemeToggle />
            </div>
          </>
        )}
      </div>

      {/* Body — collapsible */}
      {leftPanelOpen && (
        <>
          <p className="px-3 pt-2 text-[10px] text-muted-foreground shrink-0">
            Visual crypto pipeline editor
          </p>
          <div className="px-3 pt-1 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 pt-2 space-y-1 pb-2 custom-scrollbar">
            {getActiveCategories().map((cat) => {
              const allKinds = Object.values(NODE_KIND_META).filter((m) => m.category === cat);
              const kinds = allKinds.filter((k) =>
                k.label.toLowerCase().includes(searchQuery.toLowerCase()),
              );
              if (kinds.length === 0 && searchQuery) return null;

              const catMeta = CATEGORY_META[cat] ?? {
                label: cat.charAt(0).toUpperCase() + cat.slice(1),
                icon: "Hash",
                accent: "text-blue-300",
                chip: "bg-blue-500/15 text-blue-300 border-blue-500/40",
                dot: "bg-blue-400",
              };
              const isCatCollapsed = collapsedCats.has(cat);

              return (
                <div key={cat} className="group">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center gap-2 text-[10px] font-bold text-foreground/80 hover:text-foreground transition-colors py-1"
                  >
                    {isCatCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <CategoryIcon name={catMeta.icon} className={`w-4 h-4 ${catMeta.accent}`} />
                    <span>{catMeta.label}</span>
                  </button>
                  {!isCatCollapsed && (
                    <div className="flex flex-col gap-0.5 ml-3.5 border-l border-border/50 pl-3 my-1">
                      {kinds.map((k) => (
                        <div
                          key={k.kind}
                          draggable
                          onDragStart={(e) => onDragStart(e, k.kind)}
                          title={k.description}
                          className="group/item flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-accent/80 cursor-grab active:cursor-grabbing text-[11px] transition-all"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/item:text-muted-foreground/80 transition-colors" />
                          <span className="font-medium text-muted-foreground group-hover/item:text-foreground transition-colors">
                            {k.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-border shrink-0 space-y-1">
            <div className="flex gap-1 justify-center">
              <button
                onClick={openExportDialog}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
              >
                <Upload className="w-3 h-3" /> Import
              </button>
              <button
                onClick={openShareDialog}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Share workflows via link"
              >
                <Share2 className="w-3 h-3" /> Share
              </button>
            </div>
            <div className="flex gap-1 justify-center">
              <TemplateMenuButton />
              <button
                onClick={() => graphStore.setActiveGraph({ nodes: [], edges: [] })}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-destructive/5 hover:border-destructive/30 text-[9px] font-bold uppercase tracking-wider transition-all"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
