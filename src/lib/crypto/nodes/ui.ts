import { registerNodeDef } from "../registry";
import type { NodeKindMeta, NodeDef } from "../types";

export const NOTE_META: NodeKindMeta = {
  kind: "note",
  label: "Sticky Note",
  category: "ui",
  description: "Add a comment or note to your workflow.",
  inputs: [
    {
      id: "fontSize",
      label: "Font Size (px)",
      type: "number",
      defaultValue: 16,
      connectable: false,
    },
    {
      id: "colorTheme",
      label: "Color Theme",
      type: "select",
      defaultValue: "yellow",
      options: [
        { label: "Yellow (Classic)", value: "yellow" },
        { label: "Blue (Info)", value: "blue" },
        { label: "Green (Success)", value: "green" },
        { label: "Red (Warning)", value: "red" },
        { label: "Purple (Idea)", value: "purple" },
        { label: "Zinc (Draft)", value: "zinc" },
      ],
      connectable: false,
    },
    {
      id: "textAlign",
      label: "Alignment",
      type: "select",
      defaultValue: "center",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      connectable: false,
    },
    {
      id: "rotation",
      label: "Rotation (deg)",
      type: "number",
      defaultValue: 0,
      connectable: false,
    },
  ],
};

const dummyRunner = () => ({});

export const noteDef: NodeDef = {
  meta: NOTE_META,
  runner: dummyRunner,
};

registerNodeDef("note", noteDef);
