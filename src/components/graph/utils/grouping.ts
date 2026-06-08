import type { GraphNode } from "@/lib/crypto/types";

export function getAbsoluteNodePosition(node: GraphNode, nodes: GraphNode[]) {
  if (!node.parentId) return node.position;

  const parent = nodes.find((n) => n.id === node.parentId);
  if (!parent) return node.position;

  return {
    x: node.position.x + parent.position.x,
    y: node.position.y + parent.position.y,
  };
}

export function moveNodeIntoGroup(
  node: GraphNode,
  group: GraphNode,
  nodes: GraphNode[],
): GraphNode {
  const abs = getAbsoluteNodePosition(node, nodes);
  return {
    ...node,
    position: { x: abs.x - group.position.x, y: abs.y - group.position.y },
    parentId: group.id,
    extent: "parent" as const,
  };
}

export function moveNodeToCanvas(node: GraphNode, nodes: GraphNode[]): GraphNode {
  if (!node.parentId) return node;
  return {
    ...node,
    position: getAbsoluteNodePosition(node, nodes),
    parentId: undefined,
    extent: undefined,
  };
}

export function findContainingGroup(
  node: GraphNode,
  groups: GraphNode[],
  nodes: GraphNode[],
): GraphNode | null {
  const abs = getAbsoluteNodePosition(node, nodes);
  const nodeW = node.width ?? 100;
  const nodeH = node.height ?? 40;
  const nodeCx = abs.x + nodeW / 2;
  const nodeCy = abs.y + nodeH / 2;

  for (const group of groups) {
    const width = group.width ?? 200;
    const height = group.height ?? 100;
    if (
      nodeCx >= group.position.x &&
      nodeCx <= group.position.x + width &&
      nodeCy >= group.position.y &&
      nodeCy <= group.position.y + height
    ) {
      return group;
    }
  }

  return null;
}
