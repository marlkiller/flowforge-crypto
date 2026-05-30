
import { ChevronDown, ChevronRight, Github, GripVertical, Hash, Download, Upload, Share2, Copy, Trash2, Plug } from "lucide-react";
import { getActiveCategories, CATEGORY_META, NODE_KIND_META } from "@/lib/crypto/registry";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DemoMenu } from "./DemoMenu";
import { graphStore } from "../store";

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
  fileInputRef: React.RefObject<HTMLInputElement>;
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
      className={`bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${leftPanelOpen ? "w-60" : "w-8"}`}
    >
      {/* Header — always visible */}
      <div
        className={`flex items-center h-8 shrink-0 border-b border-border ${leftPanelOpen ? "gap-2 px-3 min-w-60" : "px-1 justify-center"}`}
      >
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground transition-colors shrink-0"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${leftPanelOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {leftPanelOpen && (
          <>
            <h1 className="text-xs font-semibold text-foreground">CryptoFlow</h1>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setPluginDialogOpen(true)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all group"
                title="Plugin Manager"
              >
                <Plug className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </button>
              <a
                href="https://github.com/marlkiller/flowforge-crypto"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="View on GitHub"
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
            Crypto pipeline editor
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
                    <Hash className={`w-4 h-4 ${catMeta.accent}`} />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[9px] font-bold uppercase tracking-wider transition-all">
                    <Copy className="w-3 h-3" /> DEMO
                  </button>
                </DropdownMenuTrigger>
                <DemoMenu />
              </DropdownMenu>
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
