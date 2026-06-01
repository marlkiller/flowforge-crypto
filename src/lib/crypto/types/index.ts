import type { Edge, Node } from "@xyflow/react";
import type { DataFormat } from "../service";

export type NodeCategory =
  | "io"
  | "ui"
  | "data"
  | "encoding"
  | "format"
  | "checksum"
  | "hash"
  | "cipher"
  | "public-key"
  | "signature"
  | "key-exchange"
  | "mac"
  | "kdf"
  | "entropy"
  | "protocol"
  | "secret-sharing"
  | "certificate"
  | "pqc"
  | "analysis";

export type NodeKind = string;

export interface NodeInputMeta {
  id: string;
  label: string;
  type?: "text" | "password" | "select" | "textarea" | "number";
  connectable?: boolean;
  acceptTypes?: string[];
  placeholder?: string;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
  visible?: (data: Record<string, unknown>) => boolean;
  validate?: (value: any) => string | null;
  group?: string;
  sensitive?: boolean;
  tooltip?: string;
}

export interface NodeOutputMeta {
  id: string;
  label: string;
  type?: string;
  visible?: (data: Record<string, unknown>) => boolean;
}

export interface NodeKindMeta {
  kind: NodeKind;
  label: string;
  category: NodeCategory;
  description: string;
  security?: "deprecated" | "insecure" | "caution";
  defaultOutput?: DataFormat;
  supportedFormats?: DataFormat[];
  inputs?: NodeInputMeta[];
  outputs?: NodeOutputMeta[];
  version?: number;
  migrate?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export function formatAcceptType(type: string): string {
  const map: Record<string, string> = {
    base64: "B64",
    pem: "PEM",
    hex: "HEX",
    utf8: "UTF8",
    base32: "B32",
    base58: "B58",
    bool: "BOOL",
  };
  return map[type] || type.toUpperCase();
}

export interface NodeData extends Record<string, unknown> {
  kind: NodeKind;
  label: string;
  outputFormat?: DataFormat;
  output?: string;
  outputBytesLen?: number;
  error?: string;
}

export type GraphNode = Node<NodeData>;
export type GraphEdge = Edge;

export type DataType = DataFormat | "cryptokey" | "bool" | "json" | "raw";

export interface DataValue {
  type: DataType;
  value: any; // Uint8Array for raw, string for hex/utf8/etc, CryptoKey for cryptokey
}

export interface NodeExecutionLog {
  nodeId: string;
  label: string;
  kind: string;
  status: "success" | "error" | "skipped";
  outputBytes?: Uint8Array;
  outputs?: Record<string, DataValue>;
  outputFormat?: string;
  error?: string;
  duration: number;
  params?: string;
}

export interface ExecutionResult {
  outputs: Map<string, Record<string, DataValue>>;
  errors: Map<string, string>;
  order: string[];
  logs: NodeExecutionLog[];
}

export type NodeRunner = (
  node: GraphNode,
  inputs: Record<string, any>,
) =>
  | Promise<
      | DataValue
      | Record<string, DataValue>
      | Uint8Array
      | Record<string, Uint8Array>
      | boolean
      | Record<string, boolean>
    >
  | DataValue
  | Record<string, DataValue>
  | Uint8Array
  | Record<string, Uint8Array>
  | boolean
  | Record<string, boolean>;

export interface NodeDef {
  meta: NodeKindMeta;
  runner: NodeRunner;
}
