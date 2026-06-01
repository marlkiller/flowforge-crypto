import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { graphStore, useGraphStore } from "./store";
import { Plus, Trash2, Globe, Loader2, CheckCircle2, AlertCircle, Code2, Zap } from "lucide-react";
import { loadExternalNode } from "@/lib/crypto/registry";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLUGIN_TEMPLATE = `/**
 * Custom Cryptography Node Template
 */
export const nodeDef = {
  meta: {
    // Change this ID to create a new type of node
    kind: "my_custom_node", 
    label: "My Custom Node",
    category: "data",
    description: "A node created in the browser",
    inputs: [{ id: "data", label: "Input" }],
  },
  runner: async (node, inputs) => {
    // inputs.data is a Uint8Array
    const data = new TextDecoder().decode(inputs.data || new Uint8Array());
    
    // Result must be Uint8Array or Record<string, Uint8Array>
    return new TextEncoder().encode("PROCESSED: " + data);
  }
};`;

export function PluginManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pluginUrls = useGraphStore((s) => s.pluginUrls) || [];
  const [newUrl, setNewUrl] = useState("");
  const [code, setCode] = useState(PLUGIN_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const lastEditorUrlRef = useRef<string | null>(null);

  const handleAdd = async (url: string, persist = true) => {
    const targetUrl = url.trim();
    if (!targetUrl) return null;

    // Strict duplication check against both lists
    const allUrls = graphStore.getAllPluginUrls();
    if (persist && allUrls.includes(targetUrl)) {
      toast.error("Plugin already active");
      return targetUrl;
    }

    setLoading(true);
    try {
      await loadExternalNode(targetUrl);
      graphStore.addPluginUrl(targetUrl, persist);
      setNewUrl("");
      return targetUrl;
    } catch (e) {
      toast.error(`Failed to load plugin: ${(e as Error).message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCode = async () => {
    if (!code.trim()) return;

    // Cleanup previous editor session
    if (lastEditorUrlRef.current) {
      graphStore.removePluginUrl(lastEditorUrlRef.current);
      URL.revokeObjectURL(lastEditorUrlRef.current);
    }

    setLoading(true);
    try {
      const blob = new Blob([code], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const successUrl = await handleAdd(url, false);

      if (successUrl) {
        lastEditorUrlRef.current = successUrl;
        toast.success("Code injected successfully");
      }
    } catch (e) {
      toast.error(`Injection failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (url: string) => {
    graphStore.removePluginUrl(url);
    toast.info("Plugin removed. Reload to completely unload implementation.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Code2 className="w-4 h-4" />
            </div>
            <DialogTitle>Plugin Developer</DialogTitle>
          </div>
          <DialogDescription>
            Extend the tool by adding remote ESM modules or writing code directly.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="editor" className="text-xs">
              <Zap className="w-3 h-3 mr-2" /> Code Editor
            </TabsTrigger>
            <TabsTrigger value="remote" className="text-xs">
              <Globe className="w-3 h-3 mr-2" /> Remote URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="relative group">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-[300px] bg-muted/50 p-4 font-mono text-[11px] rounded-md border border-border outline-none focus:ring-1 focus:ring-primary/30 transition-all custom-scrollbar resize-none"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-background/80 px-2 py-1 rounded border border-border text-[9px] font-bold text-muted-foreground uppercase">
                  ESM Format
                </span>
              </div>
            </div>
            <button
              onClick={handleLoadCode}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run & Inject Plugin
            </button>
          </TabsContent>

          <TabsContent value="remote" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/my-plugin.js"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="text-xs font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleAdd(newUrl)}
              />
              <button
                onClick={() => handleAdd(newUrl)}
                disabled={loading || !newUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add URL
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {pluginUrls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <Globe className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">No remote plugins</p>
                </div>
              ) : (
                pluginUrls.map((url) => (
                  <div
                    key={url}
                    className="group flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/50 border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-mono text-foreground truncate max-w-[380px]">
                        {url}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        <span className="text-[9px] text-muted-foreground">Active & Persisted</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(url)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4 mt-2">
          <div className="flex items-start gap-2 mr-auto">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[9px] text-muted-foreground leading-tight">
              Notice: Nodes defined in the editor are ephemeral and will be lost on reload. For
              permanent extensions, use the Remote URL tab.
            </p>
          </div>
          <DialogClose asChild>
            <button className="px-6 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-xs font-bold transition-colors">
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
