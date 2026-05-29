import type { Edge, Node } from "@xyflow/react";
import type { DataFormat } from "./service";

export type NodeCategory = string;

export type NodeKind = string;

export interface NodeInputMeta {
  id: string;
  label: string;
  visible?: (data: Record<string, unknown>) => boolean;
}

export interface NodeOutputMeta {
  id: string;
  label: string;
  visible?: (data: Record<string, unknown>) => boolean;
}

export interface NodeFieldMeta {
  id: string;
  label: string;
  type: "text" | "password" | "select" | "textarea" | "number";
  placeholder?: string;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
  visible?: (data: Record<string, unknown>) => boolean;
}

export interface NodeKindMeta {
  kind: NodeKind;
  label: string;
  category: NodeCategory;
  description: string;
  defaultOutput?: DataFormat;
  supportedFormats?: DataFormat[];
  inputs?: NodeInputMeta[];
  outputs?: NodeOutputMeta[];
  fields?: NodeFieldMeta[];
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

export interface NodeExecutionLog {
  nodeId: string;
  label: string;
  kind: string;
  status: "success" | "error" | "skipped";
  outputBytes?: Uint8Array;
  outputs?: Record<string, Uint8Array>;
  outputFormat?: string;
  error?: string;
  duration: number;
  params?: string;
}

export interface ExecutionResult {
  outputs: Map<string, Record<string, Uint8Array>>;
  errors: Map<string, string>;
  order: string[];
  logs: NodeExecutionLog[];
}

export type NodeRunner = (
  node: GraphNode,
  inputs: Record<string, Uint8Array>,
) =>
  | Promise<Uint8Array | Record<string, Uint8Array>>
  | Uint8Array
  | Record<string, Uint8Array>;

export interface NodeDef {
  meta: NodeKindMeta;
  runner: NodeRunner;
}
