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

export const GROUP_META: NodeKindMeta = {
  kind: "group",
  label: "Group",
  category: "ui",
  description: "Group nodes together and execute them as a unit.",
  inputs: [
    {
      id: "allowInbound",
      label: "Allow Inbound",
      type: "select",
      defaultValue: "yes",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
      connectable: false,
    },
    {
      id: "allowOutbound",
      label: "Allow Outbound",
      type: "select",
      defaultValue: "yes",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
      connectable: false,
    },
    {
      id: "label",
      label: "Group Name",
      type: "text",
      defaultValue: "Group",
      connectable: false,
    },
  ],
};

const dummyRunner = () => ({});

export const noteDef: NodeDef = {
  meta: NOTE_META,
  runner: dummyRunner,
};

export const groupDef: NodeDef = {
  meta: GROUP_META,
  runner: dummyRunner,
};

registerNodeDef("note", noteDef);
registerNodeDef("group", groupDef);
