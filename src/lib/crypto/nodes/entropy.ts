import type { NodeDef } from "../types";

export const entropyNodes: Record<string, NodeDef> = {
  random: {
    meta: {
      kind: "random",
      label: "Random Bytes",
      category: "entropy",
      description: "Generate cryptographically strong random bytes.",
      defaultOutput: "hex",
      fields: [
        { id: "length", label: "Length (Bytes)", type: "number", defaultValue: 16 },
      ],
    },
    runner: (node) => {
      const len = parseInt((node.data["length"] as string) || "16", 10);
      return crypto.getRandomValues(new Uint8Array(len));
    },
  },
};
