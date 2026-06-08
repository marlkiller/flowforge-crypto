import { useState, type RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Workflow } from "../store";
import type { SharedWorkflow } from "@/lib/crypto/share";
import { Copy, Download, Upload, ClipboardPaste, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

interface GraphDialogsProps {
  workflows: Workflow[];
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  exportSelectedIds: Set<string>;
  setExportSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  exportText: string;
  handleExportConfirm: () => void;

  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
  importCandidates: Workflow[];
  importSelectedIds: Set<string>;
  setImportSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  importText: string;
  setImportText: (text: string) => void;
  handleImportText: () => void;
  handleImportConfirm: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;

  shareDialogOpen: boolean;
  setShareDialogOpen: (open: boolean) => void;
  shareSelectedIds: Set<string>;
  setShareSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  shareUrl: string;
  handleShareConfirm: () => void;

  shareImportDialogOpen: boolean;
  setShareImportDialogOpen: (open: boolean) => void;
  sharedWorkflows: SharedWorkflow[];
  handleShareImportConfirm: () => void;
}

export function GraphDialogs({
  workflows,
  exportDialogOpen,
  setExportDialogOpen,
  exportSelectedIds,
  setExportSelectedIds,
  exportText,
  handleExportConfirm,
  importDialogOpen,
  setImportDialogOpen,
  importCandidates,
  importSelectedIds,
  setImportSelectedIds,
  importText,
  setImportText,
  handleImportText,
  handleImportConfirm,
  fileInputRef,
  shareDialogOpen,
  setShareDialogOpen,
  shareSelectedIds,
  setShareSelectedIds,
  shareUrl,
  handleShareConfirm,
  shareImportDialogOpen,
  setShareImportDialogOpen,
  sharedWorkflows,
  handleShareImportConfirm,
}: GraphDialogsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Export selection dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Workflows</DialogTitle>
            <DialogDescription>
              Select workflows to export. You can copy the JSON directly or download it as a file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Workflows ({workflows.length})
              </span>
              {workflows.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-xs transition-colors"
                >
                  <Checkbox
                    checked={exportSelectedIds.has(w.id)}
                    onCheckedChange={(checked) => {
                      setExportSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(w.id);
                        else next.delete(w.id);
                        return next;
                      });
                    }}
                  />
                  <span className="font-medium truncate flex-1">{w.name}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  JSON Preview
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent hover:bg-accent/80 text-[10px] font-medium transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={exportText}
                className="w-full h-[300px] bg-muted/50 border border-border rounded-md p-3 font-mono text-[10px] resize-none focus:outline-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleExportConfirm}
              disabled={exportSelectedIds.size === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download File ({exportSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import selection dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className={importCandidates.length > 0 ? "sm:max-w-2xl" : "sm:max-w-xl"}>
          <DialogHeader>
            <DialogTitle>Import Workflows</DialogTitle>
            <DialogDescription>
              {importCandidates.length > 0
                ? "Select which workflows from the source you want to import."
                : "Paste workflow JSON below or upload a file to begin."}
            </DialogDescription>
          </DialogHeader>

          {importCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-r border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Found ({importCandidates.length})
                </span>
                {importCandidates.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-xs transition-colors"
                  >
                    <Checkbox
                      checked={importSelectedIds.has(w.id)}
                      onCheckedChange={(checked) => {
                        setImportSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(w.id);
                          else next.delete(w.id);
                          return next;
                        });
                      }}
                    />
                    <span className="font-medium truncate flex-1">{w.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Source Summary
                  </span>
                </div>
                <div className="flex-1 bg-muted/30 border border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center text-center gap-2">
                  <Check className="w-8 h-8 text-green-500/50" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ready to import</p>
                    <p className="text-xs text-muted-foreground">
                      {importSelectedIds.size} of {importCandidates.length} workflows selected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Paste JSON
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent hover:bg-accent/80 text-[10px] font-medium transition-colors"
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                    <button
                      onClick={handleImportText}
                      disabled={!importText.trim()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-medium transition-colors disabled:opacity-50"
                    >
                      <ClipboardPaste className="w-3 h-3" /> Parse Text
                    </button>
                  </div>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='{"version": 1, "workflows": [...]}'
                  className="w-full h-[250px] bg-background border border-border rounded-md p-3 font-mono text-[10px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            {importCandidates.length > 0 && (
              <button
                onClick={handleImportConfirm}
                disabled={importSelectedIds.size === 0}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
              >
                Import Selected ({importSelectedIds.size})
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share selection dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Workflows</DialogTitle>
            <DialogDescription>
              Select workflows to include in the share link. The link updates in real-time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-r border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Workflows ({workflows.length})
              </span>
              {workflows.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-xs transition-colors"
                >
                  <Checkbox
                    checked={shareSelectedIds.has(w.id)}
                    onCheckedChange={(checked) => {
                      setShareSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(w.id);
                        else next.delete(w.id);
                        return next;
                      });
                    }}
                  />
                  <span className="font-medium truncate flex-1">{w.name}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Share Link Preview
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      toast.success("Share link copied!");
                    });
                  }}
                  disabled={!shareUrl}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent hover:bg-accent/80 text-[10px] font-medium transition-colors disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <textarea
                readOnly
                value={shareUrl}
                placeholder="Select workflows to generate link..."
                className="w-full h-[150px] bg-muted/50 border border-border rounded-md p-3 font-mono text-[10px] resize-none focus:outline-none break-all"
              />
              <p className="text-[10px] text-muted-foreground italic mt-1">
                * This link contains the entire workflow state encoded in the URL.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleShareConfirm}
              disabled={shareSelectedIds.size === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              Copy & Close ({shareSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share import dialog */}
      <Dialog open={shareImportDialogOpen} onOpenChange={setShareImportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Shared Workflow{sharedWorkflows.length > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Someone shared{" "}
              {sharedWorkflows.length > 1 ? `${sharedWorkflows.length} workflows` : "a workflow"}{" "}
              with you. Import {sharedWorkflows.length > 1 ? "them" : "it"} into your workspace?
            </DialogDescription>
          </DialogHeader>
          {sharedWorkflows.length > 0 && (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {sharedWorkflows.map((sw, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 text-sm"
                >
                  <span className="font-medium">{sw.name}</span>
                  <span className="text-xs text-muted-foreground">{sw.nodes.length} nodes</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => {
                setShareImportDialogOpen(false);
                window.location.hash = "";
              }}
              className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShareImportConfirm}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors"
            >
              Import{sharedWorkflows.length > 1 ? ` All (${sharedWorkflows.length})` : " Workflow"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
