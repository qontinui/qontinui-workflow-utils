/**
 * Secondary decomposition of giant strongly-connected components.
 *
 * The primary pass in `scc.ts` (`chunkStateMachine`) produces a condensation
 * DAG of SCCs + chain-compacted singletons. When a single SCC is "giant"
 * (typically 150+ states — a bidirectional hub / mesh), there is no further
 * refinement possible with Tarjan, so the ChunkedGraphView falls back to a
 * scrollable list. This module gives that case a structural sub-decomposition:
 *
 *   1. Pick a root (prefer `options.rootStateId`, else max in-degree in the
 *      sub-graph, lexicographic tie-break).
 *   2. Compute the iterative Lengauer-Tarjan dominator tree rooted there.
 *   3. Partition by each direct child of root's dominator subtree — each
 *      subtree is a candidate sub-chunk.
 *   4. Oversized branches (> subChunkMax) are recursively decomposed, capped
 *      at maxDepth.
 *   5. True undirected bridges of the sub-graph's skeleton are detected with
 *      Tarjan's iterative bridge algorithm and emitted via `weakBridgeTransitionIds`
 *      for the UI accent.
 *
 * Per the 2026-04-24 revision of `giant-scc-decomposition.md`, this ships
 * dominator-only — Louvain is deferred pending validation on the real
 * 402-state fixture.
 *
 * Pure: no React, no new runtime deps. Deterministic throughout.
 */

import type {
  StateMachineState,
  StateMachineTransition,
} from "@qontinui/shared-types";
import type { Chunk, ChunkKind } from "./scc";

// =============================================================================
// Public types
// =============================================================================

export interface SecondaryChunkGraph {
  subChunks: Chunk[];
  edges: Array<{
    from: string;
    to: string;
    transitionCount: number;
    transitionIds: string[];
  }>;
  stateIndex: Map<string, string>;
  weakBridgeTransitionIds: Set<string>;
  method: "dominator" | "louvain" | "mixed";
  /** True when 0 or 1 sub-chunks were produced — caller should show GiantChunkPanel. */
  degenerate: boolean;
}

export interface DecomposeGiantSCCOptions {
  rootStateId?: string | null;
  /** Default: 40. Sub-chunks larger than this are recursively decomposed. */
  subChunkMax?: number;
  /** Default: 2. Caps recursion depth to prevent deep nesting. */
  maxDepth?: number;
}

// =============================================================================
// Hash + id derivation (duplicated from scc.ts; keeping scc.ts's private API clean)
// =============================================================================

/** djb2 hash — stable, non-cryptographic, used to derive sub-chunk ids. */
function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable sub-chunk id derived from the set of contained state ids. */
function deriveSubChunkId(stateIds: readonly string[]): string {
  const sorted = stateIds.slice().sort();
  return "subchunk_" + djb2Hash(sorted.join(","));
}

// =============================================================================
// Name derivation (inline — scc.ts's commonDashPrefix is private)
// =============================================================================

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
 * Derive a display name for a sub-chunk.
 *
 * Priority:
 *   1. Singleton → the state's name.
 *   2. Common dash-prefix of length >= 2 → "{prefix}-*".
 *   3. Fallback (branch head available) → "{headName} branch".
 *   4. Final fallback → "{N} states".
 */
function deriveSubChunkName(
  stateIds: readonly string[],
  nameById: ReadonlyMap<string, string>,
  branchHead: string | null,
): string {
  const names = stateIds.map((id) => nameById.get(id) ?? id);
  if (names.length === 1) return names[0]!;

  const prefix = commonDashPrefix(names);
  if (prefix) return `${prefix}-*`;

  if (branchHead !== null) {
    const headName = nameById.get(branchHead) ?? branchHead;
    return `${headName} branch`;
  }
  return `${stateIds.length} states`;
}

// =============================================================================
// Lengauer-Tarjan dominator tree (iterative)
// =============================================================================

/**
 * Compute the dominator tree of a directed graph rooted at `root`, using the
 * sophisticated Lengauer-Tarjan O((V+E) α(V,E)) variant. Returns `idom[v]` for
 * every reachable v, with `idom[root] = root` and `idom[v] = -1` for
 * unreachable nodes.
 *
 * Reference: Lengauer & Tarjan, "A Fast Algorithm for Finding Dominators in a
 * Flowgraph", SIAM J. Comput. 1979.
 *
 * Input:
 *   - `adj[v]`    : successor indices of v
 *   - `radj[v]`   : predecessor indices of v
 *   - `root`      : entry node index
 *   - `n`         : total node count
 */
function lengauerTarjanDominators(
  adj: readonly number[][],
  radj: readonly number[][],
  root: number,
  n: number,
): Int32Array {
  // dfnum[v] = DFS number, or -1 if not reached
  const dfnum = new Int32Array(n);
  for (let i = 0; i < n; i++) dfnum[i] = -1;
  const vertex: number[] = []; // vertex[i] = node with DFS number i
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = -1;

  // Iterative DFS to assign DFS numbers.
  {
    interface Frame {
      v: number;
      iter: number;
    }
    const stack: Frame[] = [];
    dfnum[root] = 0;
    vertex.push(root);
    stack.push({ v: root, iter: 0 });
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const v = frame.v;
      const succ = adj[v]!;
      if (frame.iter < succ.length) {
        const w = succ[frame.iter]!;
        frame.iter++;
        if (dfnum[w] === -1) {
          dfnum[w] = vertex.length;
          vertex.push(w);
          parent[w] = v;
          stack.push({ v: w, iter: 0 });
        }
      } else {
        stack.pop();
      }
    }
  }

  const reachedCount = vertex.length;

  // semi[v] = semi-dominator (DFS number), initialized to DFS number of v itself
  const semi = new Int32Array(n);
  for (let i = 0; i < n; i++) semi[i] = dfnum[i]!;
  // ancestor[v], label[v] for the path-compression DSU
  const ancestor = new Int32Array(n);
  const label = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    ancestor[i] = -1;
    label[i] = i;
  }
  // bucket[v] = nodes whose semi-dominator is v
  const bucket: number[][] = Array.from({ length: n }, () => []);
  const idom = new Int32Array(n);
  for (let i = 0; i < n; i++) idom[i] = -1;

  /**
   * Iterative path-compression. Returns the ancestor of v with the minimum
   * semi-dominator on the path from v (exclusive) to the DSU root.
   */
  function evalNode(v: number): number {
    if (ancestor[v] === -1) return v;
    // First pass: collect the chain from v up to the DSU root.
    const chain: number[] = [];
    let u = v;
    while (ancestor[u] !== -1 && ancestor[ancestor[u]!] !== -1) {
      chain.push(u);
      u = ancestor[u]!;
    }
    // Now u's ancestor is a DSU root (ancestor[u] has ancestor[-1] effectively)
    // OR u itself has ancestor -1. Compress from the top of the chain downward.
    for (let i = chain.length - 1; i >= 0; i--) {
      const x = chain[i]!;
      const a = ancestor[x]!;
      if (semi[label[a]!]! < semi[label[x]!]!) {
        label[x] = label[a]!;
      }
      ancestor[x] = ancestor[a]!;
    }
    return label[v]!;
  }

  function linkNodes(v: number, w: number): void {
    ancestor[w] = v;
  }

  // Process nodes in reverse DFS order (skip the root, index 0).
  for (let i = reachedCount - 1; i >= 1; i--) {
    const w = vertex[i]!;
    // Step 2: compute semi[w]
    const preds = radj[w]!;
    for (const v of preds) {
      if (dfnum[v] === -1) continue; // unreachable predecessor, ignore
      const u = evalNode(v);
      if (semi[u]! < semi[w]!) {
        semi[w] = semi[u]!;
      }
    }
    // Add w to the bucket of its semi-dominator's vertex
    bucket[vertex[semi[w]!]!]!.push(w);
    linkNodes(parent[w]!, w);

    // Step 3: for each v in bucket[parent[w]], set idom
    const p = parent[w]!;
    const pb = bucket[p]!;
    for (const v of pb) {
      const u = evalNode(v);
      idom[v] = semi[u]! < semi[v]! ? u : p;
    }
    pb.length = 0;
  }

  // Step 4: fix up idom for nodes whose semi-dominator is not yet its idom
  for (let i = 1; i < reachedCount; i++) {
    const w = vertex[i]!;
    if (idom[w] !== vertex[semi[w]!]!) {
      idom[w] = idom[idom[w]!]!;
    }
  }
  idom[root] = root;

  return idom;
}

// =============================================================================
// Tarjan's undirected bridge algorithm (iterative)
// =============================================================================

/**
 * Find all bridges in an undirected graph given as an adjacency list. A bridge
 * is an edge whose removal disconnects the graph. Returns a Set of canonical
 * "min|max" stringified node-index pairs.
 *
 * Uses iterative DFS + discovery time + low-link. Handles parallel edges via
 * "skip one instance of parent" bookkeeping (but since we dedupe the
 * undirected skeleton before calling, parallels don't occur here).
 */
function findUndirectedBridges(
  uadj: readonly number[][],
  n: number,
): Set<string> {
  const disc = new Int32Array(n);
  const low = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    disc[i] = -1;
    low[i] = -1;
  }
  const bridges = new Set<string>();

  interface Frame {
    u: number;
    parent: number;
    iter: number;
  }
  let timer = 0;

  for (let start = 0; start < n; start++) {
    if (disc[start] !== -1) continue;
    disc[start] = timer;
    low[start] = timer;
    timer++;
    const stack: Frame[] = [{ u: start, parent: -1, iter: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const u = frame.u;
      const neighbors = uadj[u]!;

      if (frame.iter < neighbors.length) {
        const v = neighbors[frame.iter]!;
        frame.iter++;
        if (disc[v] === -1) {
          // Tree edge: descend.
          disc[v] = timer;
          low[v] = timer;
          timer++;
          stack.push({ u: v, parent: u, iter: 0 });
        } else if (v !== frame.parent) {
          // Back edge — update low[u].
          if (disc[v]! < low[u]!) low[u] = disc[v]!;
        }
        // v === parent: skip (undirected parent edge doesn't count as back edge).
      } else {
        // Finished processing u; propagate to parent and check bridge.
        stack.pop();
        if (stack.length > 0) {
          const parent = stack[stack.length - 1]!.u;
          if (low[u]! < low[parent]!) low[parent] = low[u]!;
          if (low[u]! > disc[parent]!) {
            const a = parent < u ? parent : u;
            const b = parent < u ? u : parent;
            bridges.add(a + "|" + b);
          }
        }
      }
    }
  }
  return bridges;
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Decompose a giant SCC into secondary sub-chunks using dominator-tree
 * partitioning, with Tarjan's bridge detection for UI annotation.
 */
export function decomposeGiantSCC(
  states: StateMachineState[],
  transitions: StateMachineTransition[],
  scc: Chunk,
  options: DecomposeGiantSCCOptions = {},
): SecondaryChunkGraph {
  const subChunkMax = options.subChunkMax ?? 40;
  const maxDepth = options.maxDepth ?? 2;
  return decomposeGiantSCCInternal(
    states,
    transitions,
    scc,
    options.rootStateId ?? null,
    subChunkMax,
    maxDepth,
  );
}

/**
 * Internal recursive worker. `remainingDepth` decrements on recursion; when it
 * reaches 0 we stop splitting oversized branches further.
 */
function decomposeGiantSCCInternal(
  states: StateMachineState[],
  transitions: StateMachineTransition[],
  scc: Chunk,
  rootStateIdHint: string | null,
  subChunkMax: number,
  remainingDepth: number,
): SecondaryChunkGraph {
  // ---------------------------------------------------------------------------
  // Build the restricted sub-graph over scc.stateIds.
  // ---------------------------------------------------------------------------
  const sccIds = scc.stateIds;
  const n = sccIds.length;
  const idToIndex = new Map<string, number>();
  const nameById = new Map<string, string>();
  for (let i = 0; i < n; i++) {
    idToIndex.set(sccIds[i]!, i);
  }
  const sccIdSet = new Set(sccIds);
  for (const s of states) {
    if (sccIdSet.has(s.state_id)) nameById.set(s.state_id, s.name);
  }

  const adjSets: Set<number>[] = Array.from({ length: n }, () => new Set());
  const radjSets: Set<number>[] = Array.from({ length: n }, () => new Set());
  const uadjSets: Set<number>[] = Array.from({ length: n }, () => new Set());

  // Map undirected edge "a|b" (a<b) → transition ids contributing (either dir).
  const undirectedEdgeTransitions = new Map<string, Set<string>>();

  for (const t of transitions) {
    for (const from of t.from_states) {
      const u = idToIndex.get(from);
      if (u === undefined) continue;
      for (const to of t.activate_states) {
        const v = idToIndex.get(to);
        if (v === undefined) continue;
        adjSets[u]!.add(v);
        radjSets[v]!.add(u);
        if (u !== v) {
          uadjSets[u]!.add(v);
          uadjSets[v]!.add(u);
          const a = u < v ? u : v;
          const b = u < v ? v : u;
          const key = a + "|" + b;
          let set = undirectedEdgeTransitions.get(key);
          if (!set) {
            set = new Set();
            undirectedEdgeTransitions.set(key, set);
          }
          set.add(t.transition_id);
        }
      }
    }
  }

  // Stable ordering of adjacency — sorted ascending by index. Determinism.
  const adj: number[][] = adjSets.map((s) => Array.from(s).sort((a, b) => a - b));
  const radj: number[][] = radjSets.map((s) => Array.from(s).sort((a, b) => a - b));
  const uadj: number[][] = uadjSets.map((s) => Array.from(s).sort((a, b) => a - b));

  // ---------------------------------------------------------------------------
  // Pick root.
  // ---------------------------------------------------------------------------
  let rootIdx = -1;
  if (rootStateIdHint !== null) {
    const idx = idToIndex.get(rootStateIdHint);
    if (idx !== undefined) rootIdx = idx;
  }
  if (rootIdx === -1) {
    // Max in-degree, tie-break lexicographic state_id.
    let bestInDeg = -1;
    let bestSid: string | null = null;
    for (let i = 0; i < n; i++) {
      const inDeg = radj[i]!.length;
      const sid = sccIds[i]!;
      if (
        inDeg > bestInDeg ||
        (inDeg === bestInDeg && (bestSid === null || sid < bestSid))
      ) {
        bestInDeg = inDeg;
        bestSid = sid;
        rootIdx = i;
      }
    }
  }
  if (rootIdx === -1) {
    // Empty SCC — degenerate, nothing to do.
    return {
      subChunks: [],
      edges: [],
      stateIndex: new Map(),
      weakBridgeTransitionIds: new Set(),
      method: "dominator",
      degenerate: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Dominator tree.
  // ---------------------------------------------------------------------------
  const idom = lengauerTarjanDominators(adj, radj, rootIdx, n);

  // Build children list of the dominator tree (direct children of each node,
  // except for the root whose idom is itself).
  const domChildren: number[][] = Array.from({ length: n }, () => []);
  for (let v = 0; v < n; v++) {
    if (v === rootIdx) continue;
    const p = idom[v]!;
    if (p === -1) continue; // unreachable
    domChildren[p]!.push(v);
  }
  // Sort children by state_id for determinism of sub-chunk order.
  for (let v = 0; v < n; v++) {
    domChildren[v]!.sort((a, b) => {
      const sa = sccIds[a]!;
      const sb = sccIds[b]!;
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
  }

  // ---------------------------------------------------------------------------
  // Collect candidate branches: each direct child of root, with its full
  // dominator subtree.
  //
  // The root itself is attached as a standalone "hub" sub-chunk (size 1)
  // unless the SCC has only one node.
  // ---------------------------------------------------------------------------

  /** BFS the dominator subtree rooted at `start` and return all descendants (inclusive). */
  function collectDomSubtree(start: number): number[] {
    const out: number[] = [];
    const queue: number[] = [start];
    while (queue.length > 0) {
      const v = queue.shift()!;
      out.push(v);
      for (const c of domChildren[v]!) queue.push(c);
    }
    return out;
  }

  interface Branch {
    /** The root-of-branch index (direct child of SCC root), for naming. */
    head: number;
    indices: number[];
  }
  const branches: Branch[] = [];
  for (const c of domChildren[rootIdx]!) {
    branches.push({ head: c, indices: collectDomSubtree(c) });
  }

  // Collect unreachable nodes (shouldn't happen within an SCC, but guard).
  const reachedSet = new Set<number>();
  reachedSet.add(rootIdx);
  for (const b of branches) for (const v of b.indices) reachedSet.add(v);
  const unreached: number[] = [];
  for (let i = 0; i < n; i++) if (!reachedSet.has(i)) unreached.push(i);

  // ---------------------------------------------------------------------------
  // Assemble sub-chunks.
  //
  // Strategy:
  //   - The root node gets its own 1-state "hub" sub-chunk.
  //   - Each dominator branch is a sub-chunk; oversize ones are recursively
  //     decomposed if we still have depth budget.
  //   - Unreachable nodes (pathological) get a catch-all sub-chunk.
  // ---------------------------------------------------------------------------
  const subChunks: Chunk[] = [];
  const stateIndex = new Map<string, string>();

  function emitSubChunk(
    indices: number[],
    branchHead: number | null,
  ): string {
    const stateIds = indices.map((i) => sccIds[i]!);
    const id = deriveSubChunkId(stateIds);
    const kind: ChunkKind = stateIds.length === 1 ? "chain" : "scc";
    const headId = branchHead !== null ? sccIds[branchHead]! : null;
    const name = deriveSubChunkName(stateIds, nameById, headId);
    const chunk: Chunk = {
      id,
      kind,
      stateIds,
      name,
      containsInitialState: false,
    };
    subChunks.push(chunk);
    for (const sid of stateIds) stateIndex.set(sid, id);
    return id;
  }

  // Root hub chunk (always emit as its own sub-chunk so branches have a
  // structural "return point" — though in a dense SCC the root alone is a
  // meaningful sub-chunk already).
  if (n >= 1) {
    emitSubChunk([rootIdx], null);
  }

  // Expand branches. For each, decide whether to recurse.
  for (const b of branches) {
    if (b.indices.length <= subChunkMax || remainingDepth <= 0) {
      emitSubChunk(b.indices, b.head);
      continue;
    }
    // Oversize AND we have depth budget — recurse.
    const branchStateIds = b.indices.map((i) => sccIds[i]!);
    const branchId = "scc_branch_" + djb2Hash(branchStateIds.slice().sort().join(","));
    const syntheticChunk: Chunk = {
      id: branchId,
      kind: "scc",
      stateIds: branchStateIds,
      name: nameById.get(sccIds[b.head]!) ?? sccIds[b.head]!,
      containsInitialState: false,
    };
    const inner = decomposeGiantSCCInternal(
      states,
      transitions,
      syntheticChunk,
      sccIds[b.head]!, // prefer branch head as inner root
      subChunkMax,
      remainingDepth - 1,
    );
    if (inner.degenerate) {
      // Recursion couldn't split — keep the branch as one big sub-chunk.
      emitSubChunk(b.indices, b.head);
    } else {
      for (const sub of inner.subChunks) {
        subChunks.push(sub);
        for (const sid of sub.stateIds) stateIndex.set(sid, sub.id);
      }
    }
  }

  if (unreached.length > 0) {
    emitSubChunk(unreached, null);
  }

  // ---------------------------------------------------------------------------
  // Aggregate cross sub-chunk edges from the original transitions.
  // ---------------------------------------------------------------------------
  interface AggEdge {
    transitionIds: Set<string>;
    transitionIdOrder: string[];
  }
  const edgeMap = new Map<string, AggEdge>();
  const edgeOrder: { from: string; to: string; key: string }[] = [];
  for (const t of transitions) {
    for (const from of t.from_states) {
      const u = idToIndex.get(from);
      if (u === undefined) continue;
      const fromSub = stateIndex.get(from);
      if (fromSub === undefined) continue;
      for (const to of t.activate_states) {
        const v = idToIndex.get(to);
        if (v === undefined) continue;
        const toSub = stateIndex.get(to);
        if (toSub === undefined) continue;
        if (fromSub === toSub) continue;
        const key = fromSub + " " + toSub;
        let agg = edgeMap.get(key);
        if (!agg) {
          agg = { transitionIds: new Set(), transitionIdOrder: [] };
          edgeMap.set(key, agg);
          edgeOrder.push({ from: fromSub, to: toSub, key });
        }
        if (!agg.transitionIds.has(t.transition_id)) {
          agg.transitionIds.add(t.transition_id);
          agg.transitionIdOrder.push(t.transition_id);
        }
      }
    }
  }
  const edges = edgeOrder.map(({ from, to, key }) => {
    const agg = edgeMap.get(key)!;
    return {
      from,
      to,
      transitionCount: agg.transitionIds.size,
      transitionIds: agg.transitionIdOrder,
    };
  });

  // ---------------------------------------------------------------------------
  // Weak-bridge detection on the sub-graph's undirected skeleton.
  //
  // We run this at the TOP level only (remainingDepth == initial depth);
  // recursed calls also compute their own bridges on their own sub-graphs,
  // but we don't currently merge those back — the set only ever holds
  // bridges structural at this level. That's the right semantic: a bridge
  // at the outer level is still a bridge there, and the UI accent only
  // needs the single set.
  // ---------------------------------------------------------------------------
  const bridgeKeys = findUndirectedBridges(uadj, n);
  const weakBridgeTransitionIds = new Set<string>();
  for (const key of bridgeKeys) {
    const ids = undirectedEdgeTransitions.get(key);
    if (!ids) continue;
    for (const id of ids) weakBridgeTransitionIds.add(id);
  }

  return {
    subChunks,
    edges,
    stateIndex,
    weakBridgeTransitionIds,
    method: "dominator",
    degenerate: subChunks.length <= 1,
  };
}
