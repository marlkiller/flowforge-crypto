import { registerNodeDef } from "../registry";
import { getNumberField } from "../utils";

registerNodeDef("random", {
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
    const len = getNumberField(node, "length", 16);
    return crypto.getRandomValues(new Uint8Array(len));
  },
});
