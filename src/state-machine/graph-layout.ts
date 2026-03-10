/**
 * Graph layout utilities for the state machine graph editor.
 *
 * Provides dagre-based hierarchical layout and grid fallback layout
 * for ReactFlow state machine visualization.
 */

// =============================================================================
// Layout Configuration
// =============================================================================

export interface LayoutOptions {
  direction?: "TB" | "LR" | "BT" | "RL";
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

/**
 * Default layout options for general graph layout.
 */
export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  direction: "TB",
  nodeWidth: 200,
  nodeHeight: 150,
  nodeSep: 50,
  rankSep: 100,
};

/**
 * Layout options tuned for the state machine graph editor.
 * Wider nodes and more spacing to accommodate element badges.
 */
export const STATE_MACHINE_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  direction: "TB",
  nodeWidth: 260,
  nodeHeight: 120,
  nodeSep: 70,
  rankSep: 130,
};

// =============================================================================
// State Node Sizing
// =============================================================================

/**
 * Dynamic node size tiers based on element count.
 * Returns { width, gridCols } for the state node component.
 */
export function getNodeSizeTier(elementCount: number): {
  width: number;
  gridCols: number;
} {
  if (elementCount <= 4) return { width: 200, gridCols: 3 };
  if (elementCount <= 10) return { width: 260, gridCols: 4 };
  if (elementCount <= 18) return { width: 320, gridCols: 5 };
  return { width: 380, gridCols: 6 };
}

// =============================================================================
// Element Type Styling
// =============================================================================

export interface ElementTypeStyle {
  bg: string;
  text: string;
  border: string;
}

/**
 * Color mapping for element ID prefixes.
 * Used for type-colored badges on state nodes.
 */
export const ELEMENT_TYPE_STYLES: Record<string, ElementTypeStyle> = {
  testid: {
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/30",
  },
  role: {
    bg: "bg-green-500/20",
    text: "text-green-300",
    border: "border-green-500/30",
  },
  text: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/30",
  },
  ui: {
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    border: "border-purple-500/30",
  },
  url: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
  },
  nav: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
  },
};

export const DEFAULT_ELEMENT_TYPE_STYLE: ElementTypeStyle = {
  bg: "bg-gray-500/20",
  text: "text-gray-300",
  border: "border-gray-500/30",
};

/**
 * Get the style for an element based on its ID prefix.
 */
export function getElementTypeStyle(elementId: string): ElementTypeStyle {
  const prefix = elementId.split(":")[0];
  return ELEMENT_TYPE_STYLES[prefix] ?? DEFAULT_ELEMENT_TYPE_STYLE;
}

/**
 * Get the type prefix from an element ID.
 */
export function getElementTypePrefix(elementId: string): string {
  return elementId.split(":")[0];
}

// =============================================================================
// Action Type Styling
// =============================================================================

/**
 * Color mapping for transition action types (used on edge labels).
 */
export const ACTION_TYPE_COLORS: Record<string, string> = {
  click: "text-blue-400",
  doubleClick: "text-blue-400",
  rightClick: "text-blue-400",
  type: "text-amber-400",
  select: "text-purple-400",
  wait: "text-gray-400",
  navigate: "text-cyan-400",
};

export const DEFAULT_ACTION_TYPE_COLOR = "text-gray-400";

/**
 * Get the color class for an action type.
 */
export function getActionTypeColor(actionType: string): string {
  return ACTION_TYPE_COLORS[actionType] ?? DEFAULT_ACTION_TYPE_COLOR;
}

// =============================================================================
// Confidence Display
// =============================================================================

/**
 * Get the color class for a confidence value.
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence < 0.5) return "text-red-400";
  if (confidence < 0.8) return "text-yellow-400";
  return "text-green-400";
}

// =============================================================================
// Layout Algorithms
// =============================================================================

/**
 * Minimal node/edge interface for layout computation.
 * Compatible with ReactFlow's Node/Edge types without requiring the dependency.
 */
export interface LayoutNode {
  id: string;
  position: { x: number; y: number };
  [key: string]: unknown;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

/**
 * Apply hierarchical layout using dagre.
 *
 * This function accepts a dagre instance as a parameter to avoid adding dagre
 * as a direct dependency of this package. The consuming app provides its dagre instance.
 *
 * @param dagreLib - The dagre library instance
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges connecting nodes
 * @param options - Layout configuration
 * @returns Nodes with updated positions and unchanged edges
 */
export function getLayoutedElements<
  N extends LayoutNode,
  E extends LayoutEdge,
>(
  dagreLib: {
    graphlib: { Graph: new () => DagreGraph };
    layout: (graph: DagreGraph) => void;
  },
  nodes: N[],
  edges: E[],
  options: LayoutOptions = {},
): { nodes: N[]; edges: E[] } {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const dagreGraph = new dagreLib.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagreLib.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: Math.round(pos.x - opts.nodeWidth / 2),
        y: Math.round(pos.y - opts.nodeHeight / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Apply grid layout to nodes (fallback when dagre is unavailable).
 */
export function getGridLayoutedElements<
  N extends LayoutNode,
  E extends LayoutEdge,
>(
  nodes: N[],
  edges: E[],
  columns = 4,
  nodeWidth = 200,
  nodeHeight = 150,
  spacingX = 50,
  spacingY = 50,
): { nodes: N[]; edges: E[] } {
  const layoutedNodes = nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...node,
      position: {
        x: Math.round(col * (nodeWidth + spacingX) + 100),
        y: Math.round(row * (nodeHeight + spacingY) + 100),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/** Minimal dagre graph interface for type safety */
interface DagreGraph {
  setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
  setGraph(config: Record<string, unknown>): void;
  setNode(id: string, config: Record<string, unknown>): void;
  setEdge(source: string, target: string): void;
  node(id: string): { x: number; y: number };
}

// =============================================================================
// Element Labels
// =============================================================================

/**
 * Get the display label from an element ID (part after the colon).
 * For "testid:submit-button", returns "submit-button".
 */
export function getElementLabel(elementId: string): string {
  const idx = elementId.indexOf(":");
  return idx > 0 ? elementId.slice(idx + 1) : elementId;
}

// =============================================================================
// Action Labels & Duration
// =============================================================================

/**
 * Human-readable labels for transition action types.
 */
export const ACTION_LABELS: Record<string, string> = {
  click: "Click",
  type: "Type",
  select: "Select",
  wait: "Wait",
  navigate: "Navigate",
};

/**
 * Active/in-progress labels for transition action types.
 */
export const ACTION_ACTIVE_LABELS: Record<string, string> = {
  click: "Clicking...",
  type: "Typing...",
  select: "Selecting...",
  wait: "Waiting...",
  navigate: "Navigating...",
};

/**
 * Full action color config (text, bg, border classes) for each action type.
 */
export interface ActionColorConfig {
  text: string;
  bg: string;
  border: string;
}

export const ACTION_COLOR_CONFIG: Record<string, ActionColorConfig> = {
  click: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
  },
  type: {
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
  },
  select: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
  },
  wait: {
    text: "text-gray-400",
    bg: "bg-gray-500/15",
    border: "border-gray-500/30",
  },
  navigate: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
  },
};

export const DEFAULT_ACTION_COLOR_CONFIG: ActionColorConfig = {
  text: "text-gray-400",
  bg: "bg-gray-500/15",
  border: "border-gray-500/30",
};

/**
 * Get the full color config for an action type.
 */
export function getActionColorConfig(actionType: string): ActionColorConfig {
  return ACTION_COLOR_CONFIG[actionType] ?? DEFAULT_ACTION_COLOR_CONFIG;
}

/**
 * Calculate the animation duration for an action (in ms).
 */
export function computeActionDuration(action: {
  type: string;
  text?: string;
  delay_ms?: number;
}): number {
  switch (action.type) {
    case "click":
      return 800;
    case "type":
      return Math.max(800, (action.text?.length ?? 5) * 60 + 400);
    case "navigate":
      return 1200;
    case "wait":
      return Math.min(action.delay_ms ?? 1000, 2000);
    case "select":
      return 1000;
    default:
      return 1500;
  }
}

// =============================================================================
// State Colors
// =============================================================================

export interface StateColor {
  border: string;
  bg: string;
  bgSolid: string;
}

/**
 * Color palette for visually differentiating states in spatial views.
 */
export const STATE_COLORS: readonly StateColor[] = [
  {
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    bgSolid: "rgba(59, 130, 246, 0.25)",
  },
  {
    border: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
    bgSolid: "rgba(34, 197, 94, 0.25)",
  },
  {
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    bgSolid: "rgba(245, 158, 11, 0.25)",
  },
  {
    border: "#ec4899",
    bg: "rgba(236, 72, 153, 0.12)",
    bgSolid: "rgba(236, 72, 153, 0.25)",
  },
  {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    bgSolid: "rgba(139, 92, 246, 0.25)",
  },
  {
    border: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    bgSolid: "rgba(239, 68, 68, 0.25)",
  },
  {
    border: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.12)",
    bgSolid: "rgba(6, 182, 212, 0.25)",
  },
  {
    border: "#84cc16",
    bg: "rgba(132, 204, 22, 0.12)",
    bgSolid: "rgba(132, 204, 22, 0.25)",
  },
];

// =============================================================================
// Spatial Layout
// =============================================================================

interface SpatialLayoutState {
  state_id: string;
  element_ids: string[];
}

interface SpatialLayoutTransition {
  from_states: string[];
  activate_states: string[];
}

/**
 * Compute a force-directed spatial layout for states based on shared elements
 * and transitions. Returns a map of state_id to position and radius.
 *
 * Uses Jaccard similarity on element_ids for attraction and transition
 * connections for additional attraction. Includes center gravity and
 * repulsion between all pairs.
 */
export function computeSpatialLayout(
  states: SpatialLayoutState[],
  transitions: SpatialLayoutTransition[],
  canvasWidth: number,
  canvasHeight: number,
): Map<string, { x: number; y: number; radius: number }> {
  const positions = new Map<
    string,
    { x: number; y: number; radius: number }
  >();
  if (states.length === 0) return positions;

  // Calculate element overlap between states (Jaccard similarity)
  const overlapMatrix = new Map<string, Map<string, number>>();
  for (const s1 of states) {
    const map = new Map<string, number>();
    for (const s2 of states) {
      if (s1.state_id === s2.state_id) continue;
      const s2Set = new Set(s2.element_ids);
      const intersection = s1.element_ids.filter((eid) =>
        s2Set.has(eid),
      ).length;
      const union = new Set([...s1.element_ids, ...s2.element_ids]).size;
      map.set(s2.state_id, union > 0 ? intersection / union : 0);
    }
    overlapMatrix.set(s1.state_id, map);
  }

  // Consider transition connections
  const connectionStrength = new Map<string, Map<string, number>>();
  for (const t of transitions) {
    for (const from of t.from_states) {
      for (const to of t.activate_states) {
        if (!connectionStrength.has(from))
          connectionStrength.set(from, new Map());
        const current = connectionStrength.get(from)!.get(to) ?? 0;
        connectionStrength.get(from)!.set(to, current + 1);
        if (!connectionStrength.has(to))
          connectionStrength.set(to, new Map());
        connectionStrength
          .get(to)!
          .set(from, (connectionStrength.get(to)!.get(from) ?? 0) + 1);
      }
    }
  }

  // Initialize positions in a circle
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.35;

  states.forEach((state, i) => {
    const angle = (i / states.length) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.max(
      20,
      Math.min(50, 15 + state.element_ids.length * 2),
    );
    positions.set(state.state_id, {
      x: cx + Math.cos(angle) * baseRadius,
      y: cy + Math.sin(angle) * baseRadius,
      radius,
    });
  });

  // Simple force simulation
  const iterations = 80;
  const repulsionStrength = 3000;
  const attractionStrength = 0.02;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const s of states) {
      forces.set(s.state_id, { fx: 0, fy: 0 });
    }

    // Repulsion between all pairs
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const s1 = states[i]!;
        const s2 = states[j]!;
        const p1 = positions.get(s1.state_id)!;
        const p2 = positions.get(s2.state_id)!;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(s1.state_id)!.fx -= fx;
        forces.get(s1.state_id)!.fy -= fy;
        forces.get(s2.state_id)!.fx += fx;
        forces.get(s2.state_id)!.fy += fy;
      }
    }

    // Attraction for connected/overlapping states
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const s1 = states[i]!;
        const s2 = states[j]!;
        const overlap =
          overlapMatrix.get(s1.state_id)?.get(s2.state_id) ?? 0;
        const connection =
          (connectionStrength.get(s1.state_id)?.get(s2.state_id) ?? 0) * 0.3;
        const attraction = (overlap + connection) * attractionStrength;
        if (attraction > 0) {
          const p1 = positions.get(s1.state_id)!;
          const p2 = positions.get(s2.state_id)!;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          forces.get(s1.state_id)!.fx += dx * attraction;
          forces.get(s1.state_id)!.fy += dy * attraction;
          forces.get(s2.state_id)!.fx -= dx * attraction;
          forces.get(s2.state_id)!.fy -= dy * attraction;
        }
      }
    }

    // Center gravity
    for (const s of states) {
      const p = positions.get(s.state_id)!;
      const f = forces.get(s.state_id)!;
      f.fx += (cx - p.x) * 0.005;
      f.fy += (cy - p.y) * 0.005;
    }

    // Apply forces with cooling
    const cooling = 1 - iter / iterations;
    const maxMove = 20 * cooling;
    for (const s of states) {
      const p = positions.get(s.state_id)!;
      const f = forces.get(s.state_id)!;
      const mag = Math.sqrt(f.fx * f.fx + f.fy * f.fy);
      const scale = mag > maxMove ? maxMove / mag : 1;
      p.x = Math.max(
        p.radius + 10,
        Math.min(canvasWidth - p.radius - 10, p.x + f.fx * scale),
      );
      p.y = Math.max(
        p.radius + 30,
        Math.min(canvasHeight - p.radius - 10, p.y + f.fy * scale),
      );
    }
  }

  return positions;
}
