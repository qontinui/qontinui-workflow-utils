/**
 * Chunked state machine graph renderer — pure SCC + chain-compaction utility.
 *
 * Decomposes a state machine's directed graph into a condensation DAG of
 * chunks. Each chunk is either:
 *   - `"scc"` — a strongly-connected component (size > 1, OR a singleton
 *     with a self-loop). Represents an intrinsic cycle in the graph.
 *   - `"chain"` — a merged linear run of chain-eligible singleton SCCs.
 *
 * The resulting `ChunkGraph` always has size <= the original state count,
 * and in practice compresses typical state machines by 5–10x (enough to fit
 * below the WebView2 renderable ceiling of ~150 nodes).
 *
 * This file is pure — no React, no dagre dep. Tarjan's SCC is inlined in
 * iterative form so `qontinui-workflow-utils` stays dep-free.
 */

import type {
  StateMachineState,
  StateMachineTransition,
} from "@qontinui/shared-types";

// =============================================================================
// Public types
// =============================================================================

export type ChunkKind = "scc" | "chain";

export interface Chunk {
  /** Stable, derived from contained state ids (not insertion order). */
  id: string;
  kind: ChunkKind;
  /**
   * State ids in in-chunk order. For chain chunks, the order follows the
   * path (first → last). For scc chunks, the order is Tarjan output order.
   */
  stateIds: string[];
  /** Auto-derived display name. See "Chunk naming" below. */
  name: string;
  containsInitialState: boolean;
}

export interface ChunkEdge {
  from: string;
  to: string;
  transitionCount: number;
  transitionIds: string[];
}

export interface ChunkGraph {
  chunks: Chunk[];
  /** One edge per (fromChunk, toChunk) ordered pair, deduplicated. */
  edges: ChunkEdge[];
  /** stateId → chunkId lookup. */
  stateIndex: Map<string, string>;
}

export interface ChunkStateMachineOptions {
  /**
   * Optional override for the initial state. When set, the chunk containing
   * this state id is flagged `containsInitialState: true`. If unset, falls
   * back to `extra_metadata.initial === true`, then to `states[0]`.
   */
  initialStateId?: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

/** djb2 hash — stable, non-cryptographic, used to derive chunk ids. */
function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    // Force 32-bit signed int semantics via `| 0`
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  // Unsigned 32-bit hex
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Derive a stable chunk id from the set of contained state ids.
 * Must be independent of the state insertion order in the input.
 */
function deriveChunkId(stateIds: readonly string[]): string {
  const sorted = stateIds.slice().sort();
  return "chunk_" + djb2Hash(sorted.join(","));
}

/**
 * Compute the longest common dash-separated prefix of a list of state names.
 * Returns empty string if no common prefix of length >= 2 exists.
 */
function commonDashPrefix(names: readonly string[]): string {
  if (names.length === 0) return "";
  const parts = names.map((n) => n.split("-"));
  const first = parts[0]!;
  let prefixLen = 0;
  outer: for (let i = 0; i < first.length; i++) {
    const seg = first[i]!;
    for (let j = 1; j < parts.length; j++) {
      if (parts[j]![i] !== seg) break outer;
    }
    prefixLen++;
  }
  if (prefixLen === 0) return "";
  const joined = first.slice(0, prefixLen).join("-");
  return joined.length >= 2 ? joined : "";
}

/**
 * Derive a display name for a chunk based on kind + contained state names.
 *
 * Priority:
 *   1. Singleton → the state's name.
 *   2. Chain → "first → last", or "first → … → last" if length > 5.
 *   3. SCC with common dash-prefix of length >= 2 → "{prefix}-*".
 *   4. Fallback → "{n} states: {first 3 names}…".
 */
function deriveChunkName(
  kind: ChunkKind,
  stateIds: readonly string[],
  nameById: ReadonlyMap<string, string>,
): string {
  const names = stateIds.map((id) => nameById.get(id) ?? id);

  if (names.length === 1) {
    return names[0]!;
  }

  if (kind === "chain") {
    const first = names[0]!;
    const last = names[names.length - 1]!;
    return names.length > 5 ? `${first} → … → ${last}` : `${first} → ${last}`;
  }

  // SCC with >= 2 states
  const prefix = commonDashPrefix(names);
  if (prefix) return `${prefix}-*`;

  const preview = names.slice(0, 3).join(", ");
  return `${names.length} states: ${preview}…`;
}

// =============================================================================
// Tarjan's SCC — iterative form (~30 LOC core)
// =============================================================================

/**
 * Compute strongly-connected components of a directed graph using Tarjan's
 * algorithm, iteratively (so deep graphs don't blow the JS call stack).
 *
 * Nodes are referenced by index (0..n-1). `adj[v]` is the list of successor
 * indices of `v`. Returns an array of SCCs; each SCC is an array of node
 * indices. The relative order of returned SCCs is "reverse topological"
 * (sinks first) — a standard Tarjan property.
 */
function tarjanSCC(adj: readonly number[][]): number[][] {
  const n = adj.length;
  const index = new Int32Array(n).fill(-1) as unknown as Int32Array;
  const lowlink = new Int32Array(n);
  const onStack = new Uint8Array(n);
  // Reset index to -1 (Int32Array constructor fills with 0; TS types are strict)
  for (let i = 0; i < n; i++) index[i] = -1;

  const stack: number[] = [];
  const sccs: number[][] = [];

  // Iterative DFS frame: { v, iterPos } where iterPos is the index into adj[v]
  // we're currently examining.
  interface Frame {
    v: number;
    iter: number;
  }
  const callStack: Frame[] = [];
  let nextIndex = 0;

  for (let start = 0; start < n; start++) {
    if (index[start] !== -1) continue;

    // Begin new DFS from `start`.
    index[start] = nextIndex;
    lowlink[start] = nextIndex;
    nextIndex++;
    stack.push(start);
    onStack[start] = 1;
    callStack.push({ v: start, iter: 0 });

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1]!;
      const v = frame.v;
      const successors = adj[v]!;

      if (frame.iter < successors.length) {
        const w = successors[frame.iter]!;
        frame.iter++;
        if (index[w] === -1) {
          // Recurse into w
          index[w] = nextIndex;
          lowlink[w] = nextIndex;
          nextIndex++;
          stack.push(w);
          onStack[w] = 1;
          callStack.push({ v: w, iter: 0 });
        } else if (onStack[w]) {
          if (index[w]! < lowlink[v]!) lowlink[v] = index[w]!;
        }
      } else {
        // All successors processed; pop v.
        if (lowlink[v] === index[v]) {
          // v is an SCC root — pop until we reach v.
          const comp: number[] = [];
          while (true) {
            const w = stack.pop()!;
            onStack[w] = 0;
            comp.push(w);
            if (w === v) break;
          }
          sccs.push(comp);
        }
        callStack.pop();
        // Propagate lowlink to parent (tail of call stack, if any).
        if (callStack.length > 0) {
          const parent = callStack[callStack.length - 1]!.v;
          if (lowlink[v]! < lowlink[parent]!) lowlink[parent] = lowlink[v]!;
        }
      }
    }
  }

  return sccs;
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Decompose a state machine into a chunked graph via Tarjan's SCC plus
 * linear chain compaction.
 *
 * - Adjacency is derived from `transitions[].from_states × transitions[].activate_states`.
 * - `exit_states` is IGNORED — deactivation does not create a graph edge.
 * - Self-loops are detected post-SCC: a singleton SCC with a self-edge is
 *   emitted as `kind: "scc"` (intrinsic cycle) and is INELIGIBLE for chain
 *   merging. Pure singletons are chain-eligible.
 * - Chain compaction: a maximal run of chain-eligible singletons `v1 → v2 →
 *   … → vk` is merged into a single chain chunk when each interior edge has
 *   both endpoints chain-eligible, the walked-from vertex has out-degree == 1
 *   in the condensation DAG, and the walked-to vertex has in-degree == 1.
 *   The run's starting vertex additionally requires in-degree <= 1 (it may
 *   have zero, or a single incoming cross-chunk edge, but not two).
 */
export function chunkStateMachine(
  states: StateMachineState[],
  transitions: StateMachineTransition[],
  options: ChunkStateMachineOptions = {},
): ChunkGraph {
  // -------------------------------------------------------------------------
  // Index states by logical `state_id`
  // -------------------------------------------------------------------------
  const n = states.length;
  const idToIndex = new Map<string, number>();
  const nameById = new Map<string, string>();
  for (let i = 0; i < n; i++) {
    const s = states[i]!;
    idToIndex.set(s.state_id, i);
    nameById.set(s.state_id, s.name);
  }

  // -------------------------------------------------------------------------
  // Build adjacency list (indices) + per-edge transition aggregation.
  // -------------------------------------------------------------------------
  const adjSets: Set<number>[] = Array.from({ length: n }, () => new Set());
  // Map edge key (u * n + v) -> list of transitionIds that created it.
  // Only used for cross-chunk edge aggregation below. We store (srcIdx, dstIdx, transitionId).
  interface RawEdge {
    u: number;
    v: number;
    transitionId: string;
  }
  const rawEdges: RawEdge[] = [];
  // Track self-loops per node (for singleton-self-loop post-check).
  const hasSelfLoop = new Uint8Array(n);

  for (const t of transitions) {
    for (const from of t.from_states) {
      const u = idToIndex.get(from);
      if (u === undefined) continue;
      for (const to of t.activate_states) {
        const v = idToIndex.get(to);
        if (v === undefined) continue;
        adjSets[u]!.add(v);
        rawEdges.push({ u, v, transitionId: t.transition_id });
        if (u === v) hasSelfLoop[u] = 1;
      }
    }
  }

  const adj: number[][] = adjSets.map((s) => Array.from(s));

  // -------------------------------------------------------------------------
  // Tarjan's SCC
  // -------------------------------------------------------------------------
  const sccs = tarjanSCC(adj);
  const sccOfNode = new Int32Array(n);
  for (let i = 0; i < sccs.length; i++) {
    for (const v of sccs[i]!) sccOfNode[v] = i;
  }

  // -------------------------------------------------------------------------
  // Classify each SCC as "scc" (cycle) or "singleton" (chain-eligible).
  // -------------------------------------------------------------------------
  // chainEligible[i] === true iff SCC i is a singleton without a self-loop.
  const chainEligible = new Uint8Array(sccs.length);
  const sccIsScc = new Uint8Array(sccs.length);
  for (let i = 0; i < sccs.length; i++) {
    const comp = sccs[i]!;
    if (comp.length === 1 && !hasSelfLoop[comp[0]!]) {
      chainEligible[i] = 1;
    } else {
      sccIsScc[i] = 1;
    }
  }

  // -------------------------------------------------------------------------
  // Build condensation DAG (SCC-level), deduplicated.
  // condEdges: Map<fromSCC, Map<toSCC, transitionIds[]>>
  // -------------------------------------------------------------------------
  const condOut: Map<number, Map<number, string[]>> = new Map();
  const condIn: Map<number, Map<number, string[]>> = new Map();
  for (const e of rawEdges) {
    const fromScc = sccOfNode[e.u]!;
    const toScc = sccOfNode[e.v]!;
    if (fromScc === toScc) continue; // intra-SCC edge, not in condensation
    let outMap = condOut.get(fromScc);
    if (!outMap) {
      outMap = new Map();
      condOut.set(fromScc, outMap);
    }
    let ids = outMap.get(toScc);
    if (!ids) {
      ids = [];
      outMap.set(toScc, ids);
    }
    ids.push(e.transitionId);

    let inMap = condIn.get(toScc);
    if (!inMap) {
      inMap = new Map();
      condIn.set(toScc, inMap);
    }
    let idsIn = inMap.get(fromScc);
    if (!idsIn) {
      idsIn = [];
      inMap.set(fromScc, idsIn);
    }
    // (same ids — but we keep symmetric for degree calcs; no dedup needed
    // since condIn is only used for degree counting)
    idsIn.push(e.transitionId);
  }

  const outDegree = (i: number) => condOut.get(i)?.size ?? 0;
  const inDegree = (i: number) => condIn.get(i)?.size ?? 0;

  // -------------------------------------------------------------------------
  // Chain compaction.
  //
  // A chain-eligible SCC v can extend a chain into its unique successor w
  // IFF: outDegree(v) == 1 AND inDegree(w) == 1 AND w is chain-eligible.
  //
  // A chain START vertex additionally needs inDegree(v) <= 1 — otherwise v
  // is a "merge point" that multiple predecessors point at, and hiding it
  // inside a chain would misrepresent the structure.
  //
  // We walk the condensation starting from every chain-eligible SCC that is
  // NOT extendable-from-a-predecessor, and greedily extend. Each SCC belongs
  // to exactly one chain (or none, if it's not chain-eligible).
  // -------------------------------------------------------------------------
  const chainOfScc = new Int32Array(sccs.length).fill(-1) as unknown as Int32Array;
  for (let i = 0; i < sccs.length; i++) chainOfScc[i] = -1;

  interface ChainBuild {
    sccIndices: number[]; // SCC indices in chain order
  }
  const chainBuilds: ChainBuild[] = [];

  /** Can we extend a chain from u to its successor w? */
  function canExtendFromTo(u: number, w: number): boolean {
    if (!chainEligible[u] || !chainEligible[w]) return false;
    if (outDegree(u) !== 1) return false;
    if (inDegree(w) !== 1) return false;
    return true;
  }

  /** Is `v` extendable-INTO-from its (unique, if any) predecessor? */
  function isExtendableFromPredecessor(v: number): boolean {
    if (!chainEligible[v]) return false;
    if (inDegree(v) !== 1) return false;
    const inMap = condIn.get(v)!;
    const predIter = inMap.keys().next();
    if (predIter.done) return false;
    const pred = predIter.value as number;
    return canExtendFromTo(pred, v);
  }

  for (let start = 0; start < sccs.length; start++) {
    if (!chainEligible[start]) continue;
    if (chainOfScc[start] !== -1) continue;
    // Only start a chain at a vertex that is NOT a mid-chain extension
    // of some predecessor. This guarantees each chain is walked exactly once.
    if (isExtendableFromPredecessor(start)) continue;

    const build: ChainBuild = { sccIndices: [start] };
    chainOfScc[start] = chainBuilds.length;
    let cur = start;
    while (true) {
      const outMap = condOut.get(cur);
      if (!outMap || outMap.size !== 1) break;
      const nextIter = outMap.keys().next();
      if (nextIter.done) break;
      const next = nextIter.value as number;
      if (!canExtendFromTo(cur, next)) break;
      if (chainOfScc[next] !== -1) break;
      build.sccIndices.push(next);
      chainOfScc[next] = chainBuilds.length;
      cur = next;
    }
    chainBuilds.push(build);
  }

  // -------------------------------------------------------------------------
  // Emit chunks.
  //
  // Iteration strategy:
  //   - For each chain, emit one chunk.
  //   - For each non-chain SCC (including self-loop singletons and multi-node
  //     SCCs), emit one chunk.
  //
  // We also build an `sccToChunkId` lookup used for cross-chunk edge
  // emission below.
  // -------------------------------------------------------------------------
  const initialStateId = resolveInitialStateId(states, options);

  const chunks: Chunk[] = [];
  const sccToChunkId = new Map<number, string>();
  const stateIndex = new Map<string, string>();

  for (const build of chainBuilds) {
    const stateIds = build.sccIndices.map((sccIdx) => {
      // Each chain SCC is a singleton, so sccs[sccIdx][0] is the sole state index.
      const nodeIdx = sccs[sccIdx]![0]!;
      return states[nodeIdx]!.state_id;
    });
    const chunkId = deriveChunkId(stateIds);
    const containsInitialState =
      initialStateId !== null && stateIds.includes(initialStateId);
    chunks.push({
      id: chunkId,
      kind: "chain",
      stateIds,
      name: deriveChunkName("chain", stateIds, nameById),
      containsInitialState,
    });
    for (const sccIdx of build.sccIndices) sccToChunkId.set(sccIdx, chunkId);
    for (const sid of stateIds) stateIndex.set(sid, chunkId);
  }

  for (let i = 0; i < sccs.length; i++) {
    if (chainOfScc[i] !== -1) continue;
    const comp = sccs[i]!;
    const stateIds = comp.map((nodeIdx) => states[nodeIdx]!.state_id);
    // Kind: "scc" for multi-node SCCs AND for singleton self-loops.
    const kind: ChunkKind = sccIsScc[i] ? "scc" : "chain";
    const chunkId = deriveChunkId(stateIds);
    const containsInitialState =
      initialStateId !== null && stateIds.includes(initialStateId);
    chunks.push({
      id: chunkId,
      kind,
      stateIds,
      name: deriveChunkName(kind, stateIds, nameById),
      containsInitialState,
    });
    sccToChunkId.set(i, chunkId);
    for (const sid of stateIds) stateIndex.set(sid, chunkId);
  }

  // -------------------------------------------------------------------------
  // Emit cross-chunk edges.
  //
  // For each raw transition, map (u, v) → (fromChunkId, toChunkId). Skip
  // intra-chunk edges (same chunk). Aggregate transitionIds by (from, to)
  // chunk pair.
  // -------------------------------------------------------------------------
  interface AggEdge {
    transitionIds: Set<string>;
    // Preserve first-seen insertion order for deterministic output
    transitionIdOrder: string[];
  }
  const edgeMap = new Map<string, AggEdge>();
  const edgeOrder: { from: string; to: string; key: string }[] = [];

  for (const e of rawEdges) {
    const fromScc = sccOfNode[e.u]!;
    const toScc = sccOfNode[e.v]!;
    const fromChunk = sccToChunkId.get(fromScc)!;
    const toChunk = sccToChunkId.get(toScc)!;
    if (fromChunk === toChunk) continue;
    const key = fromChunk + " " + toChunk;
    let agg = edgeMap.get(key);
    if (!agg) {
      agg = { transitionIds: new Set(), transitionIdOrder: [] };
      edgeMap.set(key, agg);
      edgeOrder.push({ from: fromChunk, to: toChunk, key });
    }
    if (!agg.transitionIds.has(e.transitionId)) {
      agg.transitionIds.add(e.transitionId);
      agg.transitionIdOrder.push(e.transitionId);
    }
  }

  const edges: ChunkEdge[] = edgeOrder.map(({ from, to, key }) => {
    const agg = edgeMap.get(key)!;
    return {
      from,
      to,
      transitionCount: agg.transitionIds.size,
      transitionIds: agg.transitionIdOrder,
    };
  });

  return { chunks, edges, stateIndex };
}

/**
 * Resolve the effective "initial" state id used for the
 * `containsInitialState` badge.
 *
 * Priority: options.initialStateId > state.extra_metadata.initial === true >
 * states[0] > null.
 */
function resolveInitialStateId(
  states: StateMachineState[],
  options: ChunkStateMachineOptions,
): string | null {
  if (options.initialStateId !== undefined && options.initialStateId !== null) {
    return options.initialStateId;
  }
  for (const s of states) {
    if (s.extra_metadata && s.extra_metadata["initial"] === true) {
      return s.state_id;
    }
  }
  return states.length > 0 ? states[0]!.state_id : null;
}
