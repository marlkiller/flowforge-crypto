import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { graphStore } from "../store";

export function WorkflowTab({
  id,
  name,
  active,
  canClose,
}: {
  id: string;
  name: string;
  active: boolean;
  canClose: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) graphStore.renameWorkflow(id, trimmed);
    else setDraft(name);
  };

  return (
    <div
      onClick={() => graphStore.setActive(id)}
      onDoubleClick={() => setEditing(true)}
      className={`group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all shrink-0 ${
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {editing ? (
        <input
          autoFocus
          className="bg-transparent outline-none border-b border-primary w-20 text-foreground"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{name}</span>
      )}
      {canClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            graphStore.removeWorkflow(id);
          }}
          className={`p-0.5 rounded-md transition-colors ${
            active
              ? "hover:bg-accent text-muted-foreground hover:text-foreground"
              : "opacity-0 group-hover:opacity-100 hover:bg-background"
          }`}
          title="Close tab"
          aria-label={`Close ${name} tab`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
