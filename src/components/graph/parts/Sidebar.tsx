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
  Archive,
  GitBranch,
  Layers,
  Save,
} from "lucide-react";
import {
  getActiveCategories,
  CATEGORY_META,
  NODE_KIND_META,
  SECURITY_META,
} from "@/lib/crypto/registry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CategoryIcon } from "./CategoryIcon";
import { graphStore } from "../store";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";

const PRESET_ICONS: Record<string, typeof Fingerprint> = {
  "Group Demo (Isolated + Connected)": Layers,
  "RSA Signing Flow": Fingerprint,
  "AES-GCM Encrypt/Decrypt": ShieldCheck,
  "AES-CBC Encrypt/Decrypt": ShieldCheck,
  "ChaCha20-Poly1305 Encrypt/Decrypt": ShieldCheck,
  "ECDSA Sign & Verify": Telescope,
  "Ed25519 Sign & Verify": Telescope,
  "JWT Sign & Verify": FileKey,
  "HMAC Sign & Verify": KeyRound,
  "Hash Suite (6 algorithms)": Hash,
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
  "Twofish-CBC Encrypt/Decrypt": ShieldCheck,
  "XSalsa20-Poly1305 Encrypt/Decrypt": ShieldCheck,
  "Blowfish-CBC Encrypt/Decrypt": ShieldCheck,
  "Salsa20 Stream Cipher": ShieldCheck,
  "RC4 Stream Cipher": Archive,
  "Rabbit Stream Cipher": Archive,
  "Merkle Tree": GitBranch,
  "Frequency Analysis": Search,
  "ECB Block Detection": Search,
  "Shamir Split & Join": Split,
  "X.509 Certificate Parse": FileKey,
  "PEM to JWK Conversion": FileKey,
  "SSH Key Parse": FileKey,
};

function TemplateMenuButton() {
  const [query, setQuery] = useState("");
  const [presets, setPresets] = useState<
    readonly { label: string; keywords: string; seed: any }[] | null
  >(null);

  const handleOpenChange = (open: boolean) => {
    if (open && !presets) {
      import("@/presets/presets").then((mod) => setPresets(mod.ALL_PRESETS));
    }
  };

  const filtered =
    query && presets
      ? presets.filter(
          (p) =>
            p.label.toLowerCase().includes(query.toLowerCase()) ||
            p.keywords.toLowerCase().includes(query.toLowerCase()),
        )
      : (presets ?? []);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all">
          <LayoutTemplate className="w-3 h-3" /> Templates
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-72">
        <div className="px-2 pt-2 pb-1">
          <input
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {!presets ? (
            <div className="px-2 py-4 text-center text-[10px] opacity-40">Loading templates...</div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-[10px] opacity-40">No templates found</div>
          ) : (
            filtered.map((p, i) => {
              const Icon = PRESET_ICONS[p.label] ?? LayoutTemplate;
              return (
                <DropdownMenuItem
                  key={p.label}
                  onClick={() => graphStore.setActiveGraph(p.seed)}
                  className="text-[11px] cursor-pointer gap-2 truncate"
                >
                  <span className="text-muted-foreground/30 tabular-nums text-[10px] w-4 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.label}</span>
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
  onDragStart: (e: React.DragEvent, kind: string) => void;
  onPointerDownNode?: (e: React.PointerEvent, kind: string) => void;
  onAddNode?: (kind: string) => void;
  openExportDialog: () => void;
  openImportDialog: () => void;
  openShareDialog: () => void;
}

export function Sidebar({
  leftPanelOpen,
  setLeftPanelOpen,
  setPluginDialogOpen,
  onDragStart,
  onPointerDownNode,
  onAddNode,
  openExportDialog,
  openImportDialog,
  openShareDialog,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const toggleCat = useCallback((cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        graphStore.save();
        toast.success("Workflow saved");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      className={`bg-card flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${leftPanelOpen ? "w-66 border-r border-border" : "w-8 border-r border-border"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center h-8 shrink-0 border-b border-border ${leftPanelOpen ? "gap-2 px-3" : "px-1 justify-center"}`}
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
                    <div className="flex flex-col gap-0.5 ml-2 border-l border-border/50 pl-2 my-0.5">
                      {kinds.map((k) => {
                        const security = k.security ? SECURITY_META[k.security] : null;
                        return (
                          <div
                            key={k.kind}
                            draggable
                            onDragStart={(e) => onDragStart(e, k.kind)}
                            onPointerDown={(e) => onPointerDownNode?.(e, k.kind)}
                            onClick={() => onAddNode?.(k.kind)}
                            title={security ? `${k.description} ${security.title}` : k.description}
                            className="group/item flex items-center gap-1.5 px-1 py-0.5 rounded-md hover:bg-accent/80 transition-all cursor-grab active:cursor-grabbing text-[11px]"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/item:text-muted-foreground/80 transition-colors shrink-0" />
                            <span className="font-medium text-muted-foreground group-hover/item:text-foreground transition-colors truncate min-w-0">
                              {k.label}
                            </span>
                            {security && (
                              <span
                                className={`ml-auto shrink-0 rounded border px-1 py-0 text-[8px] font-bold uppercase leading-3 ${security.className}`}
                              >
                                {security.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
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
                title="Export workflows as JSON file"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button
                onClick={openImportDialog}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Import workflows from JSON file"
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
                onClick={() => {
                  graphStore.setActiveGraph({ nodes: [], edges: [] });
                  graphStore.save();
                  toast.success("Workflow cleared");
                }}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-destructive/5 hover:border-destructive/30 text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Clear all nodes and edges from the canvas"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
              <button
                onClick={() => {
                  graphStore.save();
                  toast.success("Workflow saved");
                }}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-primary/10 hover:border-primary/30 text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Save workflow to localStorage (Ctrl+S)"
              >
                <Save className="w-3 h-3" /> Save
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
