import { useCallback, useEffect, useMemo, useState } from "react";

import { graphStore } from "../store";
import type { GraphNode } from "@/lib/crypto/types";

function getAbsolutePosition(node: GraphNode, nodes: GraphNode[]) {
  if (!node.parentId) return node.position;

  const parent = nodes.find((n) => n.id === node.parentId);
  if (!parent) return node.position;

  return {
    x: node.position.x + parent.position.x,
    y: node.position.y + parent.position.y,
  };
}

function moveNodeIntoGroup(node: GraphNode, group: GraphNode, nodes: GraphNode[]): GraphNode {
  const abs = getAbsolutePosition(node, nodes);
  return {
    ...node,
    position: { x: abs.x - group.position.x, y: abs.y - group.position.y },
    parentId: group.id,
    extent: "parent" as const,
  };
}

function moveNodeToCanvas(node: GraphNode, nodes: GraphNode[]): GraphNode {
  if (!node.parentId) return node;
  return {
    ...node,
    position: getAbsolutePosition(node, nodes),
    parentId: undefined,
    extent: undefined,
  };
}

export function useNodeGrouping(nodes: GraphNode[]) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup && !nodes.some((n) => n.id === selectedGroup)) {
      setSelectedGroup(null);
    }
  }, [nodes, selectedGroup]);

  const groups = useMemo(() => nodes.filter((n) => n.data.kind === "group"), [nodes]);

  const selectedNonGroupNodes = useMemo(
    () => nodes.filter((n) => n.selected && n.data.kind !== "group"),
    [nodes],
  );

  const assignNodeToGroup = useCallback((nodeId: string, groupId: string | null) => {
    const w = graphStore.getActive();
    const node = w.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (groupId) {
      const group = w.nodes.find((n) => n.id === groupId);
      if (!group) return;

      const nextNode = moveNodeIntoGroup(node, group, w.nodes);
      if (
        node.parentId === nextNode.parentId &&
        node.position.x === nextNode.position.x &&
        node.position.y === nextNode.position.y
      ) {
        return;
      }

      graphStore.snapshot();
      graphStore.setNodes(w.nodes.map((n) => (n.id === nodeId ? nextNode : n)));
      return;
    }

    if (!node.parentId) return;

    graphStore.snapshot();
    graphStore.setNodes(w.nodes.map((n) => (n.id === nodeId ? moveNodeToCanvas(n, w.nodes) : n)));
  }, []);

  const assignNodesToGroup = useCallback((nodeIds: string[], groupId: string | null) => {
    const targetIds = new Set(nodeIds);
    if (targetIds.size === 0) return;

    const w = graphStore.getActive();
    const group = groupId ? w.nodes.find((n) => n.id === groupId) : null;
    if (groupId && !group) return;

    let changed = false;
    const nextNodes = w.nodes.map((n) => {
      if (!targetIds.has(n.id)) return n;
      if (n.data.kind === "group") return n;

      if (group) {
        const next = moveNodeIntoGroup(n, group, w.nodes);
        changed =
          changed ||
          n.parentId !== next.parentId ||
          n.position.x !== next.position.x ||
          n.position.y !== next.position.y;
        return next;
      }

      if (!n.parentId) return n;
      changed = true;
      return moveNodeToCanvas(n, w.nodes);
    });

    if (!changed) return;
    graphStore.snapshot();
    graphStore.setNodes(nextNodes);
  }, []);

  return {
    groups,
    selectedGroup,
    selectedNonGroupNodes,
    setSelectedGroup,
    assignNodeToGroup,
    assignNodesToGroup,
  };
}
