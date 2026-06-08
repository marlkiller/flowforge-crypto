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
    graphStore.snapshot();
    const w = graphStore.getActive();
    const node = w.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (groupId) {
      const group = w.nodes.find((n) => n.id === groupId);
      if (!group) return;

      const abs = getAbsolutePosition(node, w.nodes);
      graphStore.setNodes(
        w.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: { x: abs.x - group.position.x, y: abs.y - group.position.y },
                parentId: groupId,
                extent: "parent" as const,
              }
            : n,
        ),
      );
      return;
    }

    if (!node.parentId) return;

    const abs = getAbsolutePosition(node, w.nodes);
    graphStore.setNodes(
      w.nodes.map((n) =>
        n.id === nodeId ? { ...n, position: abs, parentId: undefined, extent: undefined } : n,
      ),
    );
  }, []);

  const assignNodesToGroup = useCallback(
    (nodeIds: string[], groupId: string | null) => {
      for (const id of nodeIds) {
        assignNodeToGroup(id, groupId);
      }
    },
    [assignNodeToGroup],
  );

  return {
    groups,
    selectedGroup,
    selectedNonGroupNodes,
    setSelectedGroup,
    assignNodeToGroup,
    assignNodesToGroup,
  };
}
