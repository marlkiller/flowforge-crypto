import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { graphStore, type Workflow } from "../store";
import {
  encodeWorkflows,
  decodeWorkflows,
  generateShareUrl,
  parseShareHash,
  type SharedWorkflow,
} from "@/lib/crypto/share";

export function useWorkflowActions(workflows: Workflow[]) {
  // Export/Import dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSelectedIds, setExportSelectedIds] = useState<Set<string>>(new Set());
  const [exportText, setExportText] = useState("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCandidates, setImportCandidates] = useState<Workflow[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [importText, setImportText] = useState("");

  // Update export text when selection changes
  useEffect(() => {
    if (exportDialogOpen) {
      const ids = Array.from(exportSelectedIds);
      const text = graphStore.serializeWorkflows(ids);
      setExportText(text);
    }
  }, [exportSelectedIds, exportDialogOpen]);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState<Set<string>>(new Set());
  const [shareUrl, setShareUrl] = useState("");

  // Update share URL when selection changes
  useEffect(() => {
    if (shareDialogOpen) {
      const ids = Array.from(shareSelectedIds);
      if (ids.length === 0) {
        setShareUrl("");
        return;
      }
      const targets = workflows.filter((w) => ids.includes(w.id));
      const encoded = encodeWorkflows(targets);
      setShareUrl(generateShareUrl(encoded));
    }
  }, [shareSelectedIds, shareDialogOpen, workflows]);

  // Share import dialog state
  const [shareImportDialogOpen, setShareImportDialogOpen] = useState(false);
  const [sharedWorkflows, setSharedWorkflows] = useState<SharedWorkflow[]>([]);

  const openExportDialog = useCallback(() => {
    setExportSelectedIds(new Set(workflows.map((w) => w.id)));
    setExportDialogOpen(true);
  }, [workflows]);

  const handleExportConfirm = useCallback(() => {
    const ids = Array.from(exportSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    graphStore.exportWorkflows(ids);
    setExportDialogOpen(false);
  }, [exportSelectedIds]);

  const openImportDialog = useCallback(() => {
    setImportCandidates([]);
    setImportText("");
    setImportDialogOpen(true);
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const workflows = await graphStore.parseImportFile(file);
      setImportCandidates(workflows);
      setImportSelectedIds(new Set(workflows.map((w) => w.id)));
      setImportDialogOpen(true);
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleImportText = useCallback(() => {
    if (!importText.trim()) {
      toast.error("Please paste workflow JSON first");
      return;
    }
    try {
      const workflows = graphStore.parseWorkflowString(importText);
      setImportCandidates(workflows);
      setImportSelectedIds(new Set(workflows.map((w) => w.id)));
    } catch (err) {
      toast.error("Parse failed", {
        description: err instanceof Error ? err.message : "Invalid JSON format",
      });
    }
  }, [importText]);

  const handleImportConfirm = useCallback(() => {
    const ids = Array.from(importSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    const toImport = importCandidates.filter((w) => ids.includes(w.id));
    const count = graphStore.addWorkflows(toImport);
    toast.success(`Imported ${count} workflow${count > 1 ? "s" : ""}`);
    setImportDialogOpen(false);
    setImportCandidates([]);
    setImportText("");
  }, [importSelectedIds, importCandidates]);

  // Share
  const openShareDialog = useCallback(() => {
    setShareSelectedIds(new Set(workflows.map((w) => w.id)));
    setShareDialogOpen(true);
  }, [workflows]);

  const handleShareConfirm = useCallback(() => {
    const ids = Array.from(shareSelectedIds);
    if (ids.length === 0) {
      toast.error("No workflows selected");
      return;
    }
    const targets = workflows.filter((w) => ids.includes(w.id));
    const encoded = encodeWorkflows(targets);
    const url = generateShareUrl(encoded);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Share link copied to clipboard!", {
          description: `Includes ${targets.length} workflow${targets.length > 1 ? "s" : ""}. Anyone with this link can import ${targets.length > 1 ? "them" : "it"}.`,
        });
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
    setShareDialogOpen(false);
  }, [shareSelectedIds, workflows]);

  const handleShareImportConfirm = useCallback(() => {
    if (sharedWorkflows.length === 0) return;
    const toImport = sharedWorkflows.map((sw) => ({
      id: `wf_shared_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: sw.name,
      nodes: sw.nodes,
      edges: sw.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
    const count = graphStore.addWorkflows(toImport);
    toast.success(`Imported ${count} shared workflow${count > 1 ? "s" : ""}`);
    setShareImportDialogOpen(false);
    setSharedWorkflows([]);
    window.location.hash = "";
  }, [sharedWorkflows]);

  // Check URL hash for shared workflow on mount
  useEffect(() => {
    const encoded = parseShareHash();
    if (!encoded) return;
    const decoded = decodeWorkflows(encoded);
    if (decoded.length === 0) {
      toast.error("Invalid shared workflow link");
      window.location.hash = "";
      return;
    }
    setSharedWorkflows(decoded);
    setShareImportDialogOpen(true);
  }, []);

  return {
    exportDialogOpen,
    setExportDialogOpen,
    exportSelectedIds,
    setExportSelectedIds,
    exportText,
    setExportText,
    importDialogOpen,
    setImportDialogOpen,
    importCandidates,
    importSelectedIds,
    setImportSelectedIds,
    importText,
    setImportText,
    shareDialogOpen,
    setShareDialogOpen,
    shareSelectedIds,
    setShareSelectedIds,
    shareUrl,
    shareImportDialogOpen,
    setShareImportDialogOpen,
    sharedWorkflows,
    setSharedWorkflows,
    openExportDialog,
    handleExportConfirm,
    openImportDialog,
    handleImportFile,
    handleImportText,
    handleImportConfirm,
    openShareDialog,
    handleShareConfirm,
    handleShareImportConfirm,
  };
}
