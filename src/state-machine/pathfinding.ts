/**
 * Client-side pathfinding for the state machine graph editor.
 *
 * These are TypeScript implementations of BFS and Dijkstra for previewing
 * paths in the graph editor UI. They operate on the in-memory state machine
 * data (states + transitions).
 *
 * Runtime navigation uses the qontinui Python library (multistate) which has
 * more sophisticated pathfinding with action execution capabilities.
 */

import type {
  StateMachineTransition,
  PathfindingRequest,
  PathfindingStep,
  PathfindingResult,
} from "@qontinui/shared-types";

// =============================================================================
// Graph Builder
// =============================================================================

interface AdjacencyEntry {
  transition: StateMachineTransition;
  targetStates: string[];
}

/**
 * Build an adjacency list from transitions.
 * Maps each from_state to the transitions available from it.
 */
function buildAdjacencyList(
  transitions: StateMachineTransition[],
): Map<string, AdjacencyEntry[]> {
  const adj = new Map<string, AdjacencyEntry[]>();

  for (const t of transitions) {
    for (const fromState of t.from_states) {
      const entries = adj.get(fromState) ?? [];
      entries.push({
        transition: t,
        targetStates: t.activate_states,
      });
      adj.set(fromState, entries);
    }
  }

  return adj;
}

// =============================================================================
// BFS Pathfinding
// =============================================================================

/**
 * Find a path using BFS (unweighted — ignores path costs).
 * Returns the first path found (shortest by transition count).
 */
export function findPathBFS(
  transitions: StateMachineTransition[],
  request: PathfindingRequest,
): PathfindingResult {
  if (request.from_states.length === 0 || request.target_states.length === 0) {
    return { found: false, steps: [], total_cost: 0, error: "Empty state set" };
  }

  // Check if already at target
  const targetSet = new Set(request.target_states);
  if (request.from_states.some((s) => targetSet.has(s))) {
    return { found: true, steps: [], total_cost: 0 };
  }

  const adj = buildAdjacencyList(transitions);

  interface QueueEntry {
    stateId: string;
    path: PathfindingStep[];
  }

  const visited = new Set<string>();
  const queue: QueueEntry[] = [];

  for (const startState of request.from_states) {
    visited.add(startState);
    queue.push({ stateId: startState, path: [] });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const entries = adj.get(current.stateId) ?? [];

    for (const entry of entries) {
      const step: PathfindingStep = {
        transition_id: entry.transition.transition_id,
        transition_name: entry.transition.name,
        from_states: entry.transition.from_states,
        activate_states: entry.transition.activate_states,
        exit_states: entry.transition.exit_states,
        path_cost: entry.transition.path_cost,
      };

      const newPath = [...current.path, step];

      for (const target of entry.targetStates) {
        if (targetSet.has(target)) {
          const totalCost = newPath.reduce((sum, s) => sum + s.path_cost, 0);
          return { found: true, steps: newPath, total_cost: totalCost };
        }

        if (!visited.has(target)) {
          visited.add(target);
          queue.push({ stateId: target, path: newPath });
        }
      }
    }
  }

  return {
    found: false,
    steps: [],
    total_cost: 0,
    error: "No path found between the specified states",
  };
}

// =============================================================================
// Dijkstra Pathfinding
// =============================================================================

/**
 * Find a path using Dijkstra's algorithm (weighted — uses path costs).
 * Returns the cheapest path by total path_cost.
 */
export function findPathDijkstra(
  transitions: StateMachineTransition[],
  request: PathfindingRequest,
): PathfindingResult {
  if (request.from_states.length === 0 || request.target_states.length === 0) {
    return { found: false, steps: [], total_cost: 0, error: "Empty state set" };
  }

  const targetSet = new Set(request.target_states);
  if (request.from_states.some((s) => targetSet.has(s))) {
    return { found: true, steps: [], total_cost: 0 };
  }

  const adj = buildAdjacencyList(transitions);

  interface DijkstraEntry {
    stateId: string;
    cost: number;
    path: PathfindingStep[];
  }

  const bestCost = new Map<string, number>();
  // Simple priority queue using sorted insertion
  const pq: DijkstraEntry[] = [];

  for (const startState of request.from_states) {
    bestCost.set(startState, 0);
    pq.push({ stateId: startState, cost: 0, path: [] });
  }

  while (pq.length > 0) {
    // Extract minimum cost entry
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].cost < pq[minIdx].cost) minIdx = i;
    }
    const current = pq.splice(minIdx, 1)[0];

    // Skip if we've already found a better path to this state
    const known = bestCost.get(current.stateId);
    if (known !== undefined && current.cost > known) continue;

    const entries = adj.get(current.stateId) ?? [];

    for (const entry of entries) {
      const step: PathfindingStep = {
        transition_id: entry.transition.transition_id,
        transition_name: entry.transition.name,
        from_states: entry.transition.from_states,
        activate_states: entry.transition.activate_states,
        exit_states: entry.transition.exit_states,
        path_cost: entry.transition.path_cost,
      };

      const newCost = current.cost + entry.transition.path_cost;
      const newPath = [...current.path, step];

      for (const target of entry.targetStates) {
        if (targetSet.has(target)) {
          return { found: true, steps: newPath, total_cost: newCost };
        }

        const prevCost = bestCost.get(target);
        if (prevCost === undefined || newCost < prevCost) {
          bestCost.set(target, newCost);
          pq.push({ stateId: target, cost: newCost, path: newPath });
        }
      }
    }
  }

  return {
    found: false,
    steps: [],
    total_cost: 0,
    error: "No path found between the specified states",
  };
}

// =============================================================================
// Unified Interface
// =============================================================================

export type PathfindingAlgorithm = "bfs" | "dijkstra";

/**
 * Find a path between states using the specified algorithm.
 *
 * @param transitions - All transitions in the state machine
 * @param request - Source and target states
 * @param algorithm - "bfs" for shortest by hop count, "dijkstra" for cheapest by path cost
 */
export function findPath(
  transitions: StateMachineTransition[],
  request: PathfindingRequest,
  algorithm: PathfindingAlgorithm = "dijkstra",
): PathfindingResult {
  if (algorithm === "bfs") {
    return findPathBFS(transitions, request);
  }
  return findPathDijkstra(transitions, request);
}
