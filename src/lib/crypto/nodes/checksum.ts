import { registerNodeDef } from "../registry";
import { getField } from "../utils";
import { utf8ToBytes, bytesToUtf8 } from "../service";

registerNodeDef("checksum", {
  meta: {
    kind: "checksum",
    label: "Checksum",
    category: "string",
    description:
      "Compute a checksum over string data. Transition Checksum is derived from reverse-engineering Snipaste's calculate_char_transition_char.",
    defaultOutput: "utf8",
    inputs: [
      { id: "data", label: "Data", connectable: true, acceptTypes: ["raw"] },
      {
        id: "algorithm",
        label: "Algorithm",
        type: "select",
        defaultValue: "transition",
        options: [
          { label: "Transition Checksum", value: "transition" },
          { label: "Sum of Char Codes", value: "sum" },
          { label: "XOR of Bytes", value: "xor" },
        ],
        connectable: false,
      },
    ],
  },
  runner: (node, inputs) => {
    const data = inputs["data"] ?? new Uint8Array(0);
    const str = bytesToUtf8(data);
    const algorithm = getField(node, "algorithm", "transition");

    switch (algorithm) {
      case "transition": {
        if (!str) return utf8ToBytes("0");
        let total = 0;
        for (let i = 1; i < str.length; i++) {
          const prev = str.charCodeAt(i - 1);
          const cur = str.charCodeAt(i);
          total += Math.abs((prev <= 0xff ? prev : 0) - (cur <= 0xff ? cur : 0));
        }
        const index = total % str.length;
        return utf8ToBytes(str[index]);
      }
      case "sum": {
        let total = 0;
        for (let i = 0; i < str.length; i++) {
          total += str.charCodeAt(i);
        }
        return utf8ToBytes(String(total));
      }
      case "xor": {
        let x = 0;
        for (let i = 0; i < data.length; i++) {
          x ^= data[i];
        }
        return utf8ToBytes(String(x));
      }
      default:
        return utf8ToBytes("0");
    }
  },
});
