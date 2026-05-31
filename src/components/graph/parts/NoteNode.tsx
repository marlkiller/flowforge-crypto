import { NodeResizer, type NodeProps } from "@xyflow/react";
import { graphStore } from "../store";
import { memo, useRef, useEffect, useState } from "react";

const THEMES: Record<
  string,
  { bg: string; text: string; border: string; resizer: string; dot: string }
> = {
  yellow: {
    bg: "bg-note-yellow",
    text: "text-note-yellow-foreground",
    border: "border-note-yellow-border",
    resizer: "var(--color-note-yellow-foreground)",
    dot: "rgba(0,0,0,0.1)",
  },
  blue: {
    bg: "bg-note-blue",
    text: "text-note-blue-foreground",
    border: "border-note-blue-border",
    resizer: "var(--color-note-blue-foreground)",
    dot: "rgba(0,0,0,0.1)",
  },
  green: {
    bg: "bg-note-green",
    text: "text-note-green-foreground",
    border: "border-note-green-border",
    resizer: "var(--color-note-green-foreground)",
    dot: "rgba(0,0,0,0.1)",
  },
  red: {
    bg: "bg-note-red",
    text: "text-note-red-foreground",
    border: "border-note-red-border",
    resizer: "var(--color-note-red-foreground)",
    dot: "rgba(0,0,0,0.1)",
  },
  purple: {
    bg: "bg-note-purple",
    text: "text-note-purple-foreground",
    border: "border-note-purple-border",
    resizer: "var(--color-note-purple-foreground)",
    dot: "rgba(0,0,0,0.1)",
  },
  zinc: {
    bg: "bg-note-zinc",
    text: "text-note-zinc-foreground",
    border: "border-note-zinc-border",
    resizer: "var(--color-note-zinc-foreground)",
    dot: "rgba(0,0,0,0.1)",
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
    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length,
        );
      }
    }, 0);
  };

  return (
    <div
      className={`relative group min-w-[120px] min-h-[60px] transition-all duration-300 flex flex-col rounded-sm border-l-[6px] shadow-lg hover:shadow-xl ${theme.bg} ${theme.text} ${theme.border}`}
      onDoubleClick={handleDoubleClick}
      style={{
        width: "100%",
        height: "100%",
        transform: `rotate(${rotation}deg)`,
        boxShadow: selected
          ? `0 0 0 2px var(--color-primary), 0 20px 25px -5px rgb(0 0 0 / 0.15)`
          : undefined,
      }}
    >
      <NodeResizer
        color={theme.resizer}
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
      />

      {/* Drag Handle Area - Professional dots */}
      <div
        className="w-full h-5 cursor-move flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
      </div>

      <div
        className={`flex-1 p-5 flex flex-col justify-center overflow-hidden ${!isEditing ? "cursor-move" : "cursor-text"}`}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel w-full bg-transparent border-none outline-none resize-none placeholder:opacity-30 font-medium leading-relaxed overflow-hidden"
            style={{
              fontSize: `${fontSize}px`,
              textAlign: textAlign as "left" | "center" | "right",
              color: "inherit",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            }}
            value={(data.text as string) || ""}
            onChange={(e) => update({ text: e.target.value })}
            onBlur={handleBlur}
            placeholder="Start typing..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="w-full whitespace-pre-wrap break-words leading-relaxed select-none pointer-events-none font-medium"
            style={{
              fontSize: `${fontSize}px`,
              textAlign: textAlign as "left" | "center" | "right",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            }}
          >
            {(data.text as string) || (
              <span className="opacity-30 italic text-[12px]">Double click to edit</span>
            )}
          </div>
        )}
      </div>

      {/* Subtle bottom-right fold effect */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 opacity-10"
        style={{
          background: "linear-gradient(135deg, transparent 50%, currentColor 50%)",
        }}
      />
    </div>
  );
});
