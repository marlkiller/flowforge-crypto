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

interface GraphDialogsProps {
  workflows: Workflow[];
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
  exportSelectedIds: Set<string>;
  setExportSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  handleExportConfirm: () => void;

  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
  importCandidates: Workflow[];
  importSelectedIds: Set<string>;
  setImportSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  handleImportConfirm: () => void;

  shareDialogOpen: boolean;
  setShareDialogOpen: (open: boolean) => void;
  shareSelectedIds: Set<string>;
  setShareSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
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
  handleExportConfirm,
  importDialogOpen,
  setImportDialogOpen,
  importCandidates,
  importSelectedIds,
  setImportSelectedIds,
  handleImportConfirm,
  shareDialogOpen,
  setShareDialogOpen,
  shareSelectedIds,
  setShareSelectedIds,
  handleShareConfirm,
  shareImportDialogOpen,
  setShareImportDialogOpen,
  sharedWorkflows,
  handleShareImportConfirm,
}: GraphDialogsProps) {
  return (
    <>
      {/* Export selection dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Workflows</DialogTitle>
            <DialogDescription>Select workflows to export</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {workflows.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
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
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleExportConfirm}
              disabled={exportSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Export ({exportSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import selection dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Workflows</DialogTitle>
            <DialogDescription>Select workflows to import</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {importCandidates.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
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
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleImportConfirm}
              disabled={importSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Import ({importSelectedIds.size})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share selection dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Workflows</DialogTitle>
            <DialogDescription>Select workflows to include in the share link</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {workflows.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer text-sm transition-colors"
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
                <span className="font-medium">{w.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {w.nodes.length} nodes
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleShareConfirm}
              disabled={shareSelectedIds.size === 0}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-colors disabled:opacity-50"
            >
              Copy Link ({shareSelectedIds.size})
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
