import dagre from "dagre";
import type { GraphNode, GraphEdge } from "./types";
import { NODE_KIND_META } from "./registry";

const NODE_WIDTH = 260;

function estimateNodeHeight(node: GraphNode): number {
  const meta = node.data?.kind ? NODE_KIND_META[node.data.kind] : undefined;
  const formFields = meta?.inputs?.filter((i) => i.type) ?? [];
  const fieldCount = formFields.length;
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
  const groupNodes = nodes.filter((n) => n.data.kind === "group");
  const groupIds = new Set(groupNodes.map((n) => n.id));
  const childIds = new Set<string>();
  for (const n of nodes) {
    if (n.parentId && groupIds.has(n.parentId)) childIds.add(n.id);
  }

  if (groupNodes.length === 0) {
    return flatLayout(nodes, edges, direction);
  }

  const INTERNAL_PADDING = 60;

  // ── Pass 1: Layout each group's children independently ──
  const groupLayouts = new Map<
    string,
    {
      width: number;
      height: number;
      children: GraphNode[];
      edgePoints: Map<string, { x: number; y: number }[]>;
    }
  >();

  for (const group of groupNodes) {
    const children = nodes.filter((c) => c.parentId === group.id);
    if (children.length === 0) {
      groupLayouts.set(group.id, {
        width: group.width ?? 500,
        height: group.height ?? 360,
        children: [],
        edgePoints: new Map(),
      });
      continue;
    }

    const childSet = new Set(children.map((c) => c.id));
    const internalEdges = edges.filter((e) => childSet.has(e.source) && childSet.has(e.target));

    const ig = new dagre.graphlib.Graph();
    ig.setDefaultEdgeLabel(() => ({}));
    ig.setGraph({
      rankdir: direction,
      nodesep: 30,
      ranksep: 50,
      marginx: 15,
      marginy: 15,
    });

    for (const child of children) {
      ig.setNode(child.id, {
        width: NODE_WIDTH,
        height: estimateNodeHeight(child),
      });
    }
    for (const edge of internalEdges) {
      ig.setEdge(edge.source, edge.target, { id: edge.id });
    }

    dagre.layout(ig);

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const child of children) {
      const p = ig.node(child.id);
      const cw = NODE_WIDTH;
      const ch = estimateNodeHeight(child);
      minX = Math.min(minX, p.x - cw / 2);
      minY = Math.min(minY, p.y - ch / 2);
      maxX = Math.max(maxX, p.x + cw / 2);
      maxY = Math.max(maxY, p.y + ch / 2);
    }

    const groupW = Math.max(maxX - minX + INTERNAL_PADDING * 2, 300);
    const groupH = Math.max(maxY - minY + INTERNAL_PADDING * 2, 200);
    const gx = (minX + maxX) / 2 - groupW / 2;
    const gy = (minY + maxY) / 2 - groupH / 2;

    const layoutedChildren = children.map((child) => {
      const p = ig.node(child.id);
      const cw = NODE_WIDTH;
      const ch = estimateNodeHeight(child);
      return {
        ...child,
        position: {
          x: p.x - cw / 2 - gx,
          y: p.y - ch / 2 - gy,
        },
        parentId: group.id,
        extent: "parent" as const,
      } as GraphNode;
    });

    const edgePoints = new Map<string, { x: number; y: number }[]>();
    for (const edge of internalEdges) {
      const dagrePoints = ig.edge(edge.source, edge.target)?.points;
      if (dagrePoints && dagrePoints.length >= 2) {
        edgePoints.set(
          edge.id,
          dagrePoints.map((p: { x: number; y: number }) => ({
            x: p.x - gx,
            y: p.y - gy,
          })),
        );
      }
    }

    groupLayouts.set(group.id, {
      width: groupW,
      height: groupH,
      children: layoutedChildren,
      edgePoints,
    });
  }

  // ── Pass 2: Top-level layout (groups + ungrouped nodes) ──
  // Map cross-boundary edges through parent groups
  const crossEdgeMap = new Map<string, { source: string; target: string }>();
  for (const edge of edges) {
    const srcParent = childIds.has(edge.source)
      ? (nodes.find((n) => n.id === edge.source)?.parentId ?? edge.source)
      : edge.source;
    const tgtParent = childIds.has(edge.target)
      ? (nodes.find((n) => n.id === edge.target)?.parentId ?? edge.target)
      : edge.target;
    if (srcParent !== tgtParent) {
      crossEdgeMap.set(edge.id, { source: srcParent!, target: tgtParent! });
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 100,
    marginx: 35,
    marginy: 35,
  });

  for (const node of nodes) {
    if (childIds.has(node.id)) continue;
    const isGroup = groupIds.has(node.id);
    const layout = isGroup ? groupLayouts.get(node.id) : undefined;
    const w = isGroup ? (layout?.width ?? node.width ?? 500) : NODE_WIDTH;
    const h = isGroup ? (layout?.height ?? node.height ?? 360) : estimateNodeHeight(node);
    g.setNode(node.id, { width: w, height: h });
  }

  for (const { source, target } of crossEdgeMap.values()) {
    g.setEdge(source, target, {});
  }

  dagre.layout(g);

  const crossEdgePoints = new Map<string, { x: number; y: number }[]>();
  for (const [edgeId, { source, target }] of crossEdgeMap) {
    const dagrePoints = g.edge(source, target)?.points;
    if (dagrePoints && dagrePoints.length >= 2) {
      crossEdgePoints.set(
        edgeId,
        dagrePoints.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
      );
    }
  }

  // ── Pass 3: Compose ──
  const layoutedNodes: GraphNode[] = [];
  const groupPositions = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (childIds.has(node.id)) continue;

    const isGroup = groupIds.has(node.id);
    const layout = isGroup ? groupLayouts.get(node.id) : undefined;

    if (isGroup) {
      const pos = g.node(node.id);
      const nw = pos.width;
      const nh = pos.height;
      const gpos = { x: pos.x - nw / 2, y: pos.y - nh / 2 };
      groupPositions.set(node.id, gpos);

      layoutedNodes.push({
        ...node,
        position: gpos,
        width: layout?.width ?? nw,
        height: layout?.height ?? nh,
        style: {
          ...((node.style ?? {}) as Record<string, unknown>),
          width: layout?.width ?? nw,
          height: layout?.height ?? nh,
        },
      } as GraphNode);

      if (layout) {
        for (const child of layout.children) {
          layoutedNodes.push(child);
        }
      }
    } else {
      const pos = g.node(node.id);
      const h = estimateNodeHeight(node);
      layoutedNodes.push({
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - h / 2,
        },
      } as GraphNode);
    }
  }

  const layoutedEdges = edges.map((edge) => {
    const srcParent = childIds.has(edge.source)
      ? nodes.find((n) => n.id === edge.source)?.parentId
      : undefined;
    const tgtParent = childIds.has(edge.target)
      ? nodes.find((n) => n.id === edge.target)?.parentId
      : undefined;
    const internalToGroup = srcParent && tgtParent && srcParent === tgtParent;

    let dagrePoints: { x: number; y: number }[] | undefined;

    if (internalToGroup) {
      const layout = groupLayouts.get(srcParent!);
      const gpos = groupPositions.get(srcParent!);
      if (layout && gpos) {
        const internalPoints = layout.edgePoints.get(edge.id);
        if (internalPoints) {
          dagrePoints = internalPoints.map((p) => ({
            x: p.x + gpos.x,
            y: p.y + gpos.y,
          }));
        }
      }
    } else {
      dagrePoints = crossEdgePoints.get(edge.id);
    }

    return {
      ...edge,
      data: {
        ...edge.data,
        ...(dagrePoints && dagrePoints.length >= 2 ? { dagrePath: dagrePoints } : {}),
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

function flatLayout(nodes: GraphNode[], edges: GraphEdge[], direction: "TB" | "LR"): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 100,
    marginx: 35,
    marginy: 35,
  });

  for (const node of nodes) {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateNodeHeight(node),
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { id: edge.id });
  }

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
    } as GraphNode;
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
