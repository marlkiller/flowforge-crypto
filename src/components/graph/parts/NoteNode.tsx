import { NodeResizer, type NodeProps } from "@xyflow/react";
import { graphStore } from "../store";
import { memo, useRef, useEffect, useState } from "react";

const THEMES: Record<string, { bg: string; text: string; resizer: string; handle: string }> = {
  yellow: {
    bg: "bg-note-yellow",
    text: "text-note-yellow-foreground",
    resizer: "var(--color-note-yellow-foreground)",
    handle: "rgba(var(--color-note-yellow-foreground), 0.1)",
  },
  blue: {
    bg: "bg-note-blue",
    text: "text-note-blue-foreground",
    resizer: "var(--color-note-blue-foreground)",
    handle: "rgba(var(--color-note-blue-foreground), 0.1)",
  },
  green: {
    bg: "bg-note-green",
    text: "text-note-green-foreground",
    resizer: "var(--color-note-green-foreground)",
    handle: "rgba(var(--color-note-green-foreground), 0.1)",
  },
  red: {
    bg: "bg-note-red",
    text: "text-note-red-foreground",
    resizer: "var(--color-note-red-foreground)",
    handle: "rgba(var(--color-note-red-foreground), 0.1)",
  },
  purple: {
    bg: "bg-note-purple",
    text: "text-note-purple-foreground",
    resizer: "var(--color-note-purple-foreground)",
    handle: "rgba(var(--color-note-purple-foreground), 0.1)",
  },
  zinc: {
    bg: "bg-note-zinc",
    text: "text-note-zinc-foreground",
    resizer: "var(--color-note-zinc-foreground)",
    handle: "rgba(var(--color-note-zinc-foreground), 0.1)",
  },
};

export const NoteNode = memo(({ id, data, selected }: NodeProps) => {
  const update = (patch: Record<string, unknown>) => graphStore.updateNodeData(id, patch);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const themeKey = (data.colorTheme as string) || "yellow";
  const theme = THEMES[themeKey] || THEMES.yellow;
  const fontSize = Number(data.fontSize) || 16;
  const textAlign = (data.textAlign as string) || "center";
  const rotation = Number(data.rotation) || 0;

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [data.text, fontSize, isEditing]);

  const handleBlur = () => setIsEditing(false);
  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div
      className={`relative group min-w-[100px] min-h-[40px] shadow-xl transition-all duration-200 flex flex-col ${theme.bg} ${theme.text}`}
      onDoubleClick={handleDoubleClick}
      style={{
        width: "100%",
        height: "100%",
        transform: `rotate(${rotation}deg)`,
        boxShadow: selected
          ? `0 0 0 3px var(--color-primary), 0 25px 30px -5px rgb(0 0 0 / 0.15)`
          : `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)`,
      }}
    >
      <NodeResizer
        color={theme.resizer}
        isVisible={selected}
        minWidth={60}
        minHeight={40}
        handleStyle={{ width: 12, height: 12, borderRadius: 6 }}
      />

      {/* Drag Handle Area */}
      <div
        className="w-full h-4 cursor-move flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
      >
        <div className="w-1 h-1 rounded-full bg-current opacity-30" />
        <div className="w-1 h-1 rounded-full bg-current opacity-30" />
        <div className="w-1 h-1 rounded-full bg-current opacity-30" />
      </div>

      <div
        className={`flex-1 p-4 flex flex-col justify-center overflow-hidden ${!isEditing ? "cursor-move" : "cursor-text"}`}
      >
        <textarea
          ref={textareaRef}
          className={`nowheel w-full bg-transparent border-none outline-none resize-none placeholder:opacity-30 font-medium leading-relaxed overflow-hidden ${isEditing ? "nodrag" : "pointer-events-none"}`}
          style={{
            fontSize: `${fontSize}px`,
            textAlign: textAlign as "left" | "center" | "right",
            color: "inherit",
          }}
          value={(data.text as string) || ""}
          onChange={(e) => update({ text: e.target.value })}
          onBlur={handleBlur}
          placeholder={isEditing ? "Start typing..." : ""}
          onClick={(e) => isEditing && e.stopPropagation()}
        />
        {!isEditing && !data.text && (
          <div className="text-center opacity-30 italic text-[10px] select-none pointer-events-none">
            Double click to edit
          </div>
        )}
      </div>
    </div>
  );
});
