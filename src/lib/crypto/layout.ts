import dagre from "dagre";
import type { GraphNode, GraphEdge } from "./types";
import { NODE_KIND_META } from "./registry";

const NODE_WIDTH = 260;

function estimateNodeHeight(node: GraphNode): number {
  const meta = node.data?.kind ? NODE_KIND_META[node.data.kind] : undefined;
  const fieldCount = meta?.fields?.length ?? 0;
  const hasOutput = !!(node.data?.output || node.data?.error);
  return 56 + fieldCount * 40 + (hasOutput ? 48 : 0);
}

export interface LayoutResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getLayoutedNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: "TB" | "LR" = "LR",
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 100,
    marginx: 35,
    marginy: 35,
  });

  nodes.forEach((node) => {
    const h = estimateNodeHeight(node);
    g.setNode(node.id, { width: NODE_WIDTH, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target, { id: edge.id });
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const h = estimateNodeHeight(node);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - h / 2,
      },
    };
  });

  const layoutedEdges = edges.map((edge) => {
    const dagrePoints = g.edge(edge.source, edge.target)?.points;
    return {
      ...edge,
      data: {
        ...edge.data,
        ...(dagrePoints && dagrePoints.length >= 2
          ? { dagrePath: dagrePoints.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })) }
          : {}),
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
