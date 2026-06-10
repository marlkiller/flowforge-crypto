import type { GraphEdge, GraphNode } from "@/lib/crypto/types";

export function useGraphSelection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
) {
  const selectedNodeIds = new Set<string>();
  if (selectedNodeId) selectedNodeIds.add(selectedNodeId);
  for (const node of nodes) {
    if (node.selected) selectedNodeIds.add(node.id);
  }

  const selectedEdgeIds = new Set<string>();
  if (selectedEdgeId) selectedEdgeIds.add(selectedEdgeId);
  for (const edge of edges) {
    if (edge.selected) selectedEdgeIds.add(edge.id);
  }

  const selectedNodes = nodes.filter((node) => selectedNodeIds.has(node.id));
  const selectedNonGroupNodes = selectedNodes.filter((node) => node.data.kind !== "group");

  return {
    selectedNodeIds,
    selectedEdgeIds,
    selectedNodes,
    selectedNonGroupNodes,
    selectedNodeCount: selectedNodeIds.size,
    selectedEdgeCount: selectedEdgeIds.size,
    hasSelection: selectedNodeIds.size > 0 || selectedEdgeIds.size > 0,
  };
}
