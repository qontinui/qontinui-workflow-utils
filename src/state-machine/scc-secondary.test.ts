/**
 * Unit tests for decomposeGiantSCC() — Phase 1 secondary-decomposition utility.
 *
 * Per the plan's revision note, this ships dominator-only (no Louvain).
 * Cases:
 *   1. Trivial — small SCC below threshold → one sub-chunk, degenerate: true.
 *   2. Dominator-clean — hub + 3 branches of ~20 → 3 branch sub-chunks + hub.
 *   3. Recursive — 200-state SCC with one 120-state branch → branch splits.
 *   4. Weak-bridge detection — two clusters joined by single undirected edge.
 *   5. K5 clique → weakBridgeTransitionIds empty.
 *   6. Stability — permuting input order yields identical sub-chunk ids + bridges.
 *   7. Degenerate K_{n,n} → degenerate: true.
 */

import { describe, it, expect } from "vitest";
import type {
  StateMachineState,
  StateMachineTransition,
} from "@qontinui/shared-types";
import { chunkStateMachine, type Chunk } from "./scc";
import { decomposeGiantSCC } from "./scc-secondary";

// =============================================================================
// Test helpers (local copies — scc.test.ts's mk* helpers are private)
// =============================================================================

function mkState(
  state_id: string,
  opts?: { name?: string; initial?: boolean },
): StateMachineState {
  return {
    acceptance_criteria: [],
    confidence: 1.0,
    config_id: "test-config",
    created_at: "2026-04-23T00:00:00Z",
    description: null,
    domain_knowledge: [],
    element_ids: [],
    extra_metadata: opts?.initial ? { initial: true } : {},
    id: `uuid-${state_id}`,
    name: opts?.name ?? state_id,
    render_ids: [],
    state_id,
    updated_at: "2026-04-23T00:00:00Z",
  };
}

function mkTransition(
  transition_id: string,
  from: string,
  to: string,
): StateMachineTransition {
  return {
    actions: [],
    activate_states: [to],
    config_id: "test-config",
    created_at: "2026-04-23T00:00:00Z",
    exit_states: [],
    extra_metadata: {},
    from_states: [from],
    id: `uuid-${transition_id}`,
    name: transition_id,
    path_cost: 1,
    stays_visible: false,
    transition_id,
    updated_at: "2026-04-23T00:00:00Z",
  };
}

/** Build a synthetic Chunk carrying the given state ids. */
function mkChunk(stateIds: string[]): Chunk {
  return {
    id: "test_chunk_" + stateIds.slice().sort().join("_").slice(0, 30),
    kind: "scc",
    stateIds,
    name: "test chunk",
    containsInitialState: false,
  };
}

// =============================================================================
// Case 1 — Trivial 3-state SCC
// =============================================================================

describe("decomposeGiantSCC — trivial", () => {
  it("3-state SCC below subChunkMax → degenerate (base case)", () => {
    const ids = ["a", "b", "c"];
    const states = ids.map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "a", "b"),
      mkTransition("t2", "b", "c"),
      mkTransition("t3", "c", "a"),
    ];
    const chunk = mkChunk(ids);

    const result = decomposeGiantSCC(states, transitions, chunk, {
      subChunkMax: 40,
    });

    // Input fits under subChunkMax → base case fires, no decomposition done.
    // Caller treats the whole region as one leaf chunk.
    expect(result.degenerate).toBe(true);
    expect(result.subChunks).toHaveLength(0);
  });

  it("1-state SCC → degenerate: true", () => {
    const states = [mkState("a")];
    const transitions = [mkTransition("t1", "a", "a")];
    const result = decomposeGiantSCC(states, transitions, mkChunk(["a"]), {});
    expect(result.degenerate).toBe(true);
    expect(result.subChunks.length).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Case 2 — Dominator-clean: hub with 3 branches
// =============================================================================

describe("decomposeGiantSCC — dominator-clean hub + 3 branches", () => {
  it("hub with 3 branches of 20 states each produces 3 branch sub-chunks + hub", () => {
    // Structure: hub "H". Three branches of 20 states each; each branch is a
    // linear path from H into the branch and back to H via the last node.
    //   H → B1_0 → B1_1 → ... → B1_19 → H  (branch 1)
    //   H → B2_0 → ...                       (branch 2)
    //   H → B3_0 → ...                       (branch 3)
    // Each branch node is only reachable via H, so H dominates all. The
    // branch heads (B1_0, B2_0, B3_0) are direct children of H in the
    // dominator tree, and each branch's tail chain forms a subtree of 20.
    const ids: string[] = ["H"];
    const states: StateMachineState[] = [mkState("H")];
    const transitions: StateMachineTransition[] = [];
    let tCounter = 0;
    const tid = () => `t${tCounter++}`;

    for (let k = 1; k <= 3; k++) {
      const branchIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const id = `B${k}_${i}`;
        branchIds.push(id);
        ids.push(id);
        states.push(mkState(id));
      }
      // H → B{k}_0
      transitions.push(mkTransition(tid(), "H", branchIds[0]!));
      // Linear inside branch.
      for (let i = 1; i < 20; i++) {
        transitions.push(mkTransition(tid(), branchIds[i - 1]!, branchIds[i]!));
      }
      // Back to hub.
      transitions.push(mkTransition(tid(), branchIds[19]!, "H"));
    }

    // Give H explicit initial metadata so we prefer it as root (plus it has
    // max in-degree — 3 branches all point to it).
    const chunk = mkChunk(ids);
    const result = decomposeGiantSCC(states, transitions, chunk, {
      rootStateId: "H",
      subChunkMax: 40,
    });

    expect(result.method).toBe("dominator");
    expect(result.degenerate).toBe(false);

    // Expect 1 hub sub-chunk (just "H") + 3 branch sub-chunks of 20 each.
    expect(result.subChunks.length).toBe(4);

    const branchSizes = result.subChunks
      .map((c) => c.stateIds.length)
      .sort((a, b) => a - b);
    expect(branchSizes).toEqual([1, 20, 20, 20]);

    // Coverage.
    const covered = new Set<string>();
    for (const sc of result.subChunks) {
      for (const sid of sc.stateIds) covered.add(sid);
    }
    expect(covered).toEqual(new Set(ids));

    // Each branch must be contiguous (all B{k}_* in the same sub-chunk).
    for (let k = 1; k <= 3; k++) {
      const prefix = `B${k}_`;
      const chunkOf = new Set<string>();
      for (const sc of result.subChunks) {
        for (const sid of sc.stateIds) {
          if (sid.startsWith(prefix)) chunkOf.add(sc.id);
        }
      }
      expect(chunkOf.size).toBe(1);
    }
  });
});

// =============================================================================
// Case 3 — Recursive decomposition
// =============================================================================

describe("decomposeGiantSCC — recursive", () => {
  it("200-state SCC with one 120-state branch recurses to split further", () => {
    // Build: hub H with 4 small branches (20 states each) and one BIG branch.
    // BIG branch itself has a sub-hub "M" with 6 sub-branches of 20 each.
    // Returning from everything to H to keep it an SCC.
    const ids: string[] = ["H"];
    const states: StateMachineState[] = [mkState("H")];
    const transitions: StateMachineTransition[] = [];
    let tCounter = 0;
    const tid = () => `t${tCounter++}`;

    // 4 small branches (20 each = 80).
    for (let k = 1; k <= 4; k++) {
      const branchIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const sid = `S${k}_${i}`;
        branchIds.push(sid);
        ids.push(sid);
        states.push(mkState(sid));
      }
      transitions.push(mkTransition(tid(), "H", branchIds[0]!));
      for (let i = 1; i < 20; i++) {
        transitions.push(mkTransition(tid(), branchIds[i - 1]!, branchIds[i]!));
      }
      transitions.push(mkTransition(tid(), branchIds[19]!, "H"));
    }

    // Big 120-state branch: gateway "G" then sub-hub "M" with 6 sub-branches
    // of ~20. G is uniquely reached from H, so BIG is a dominator subtree
    // rooted at G (size 120).
    ids.push("G");
    states.push(mkState("G"));
    ids.push("M");
    states.push(mkState("M"));
    transitions.push(mkTransition(tid(), "H", "G"));
    transitions.push(mkTransition(tid(), "G", "M"));

    for (let k = 1; k <= 6; k++) {
      const subBranchIds: string[] = [];
      // 19 states per sub-branch × 6 = 114. + 4 extra padding to hit 120.
      const size = k <= 4 ? 20 : 17;
      for (let i = 0; i < size; i++) {
        const sid = `D${k}_${i}`;
        subBranchIds.push(sid);
        ids.push(sid);
        states.push(mkState(sid));
      }
      transitions.push(mkTransition(tid(), "M", subBranchIds[0]!));
      for (let i = 1; i < size; i++) {
        transitions.push(
          mkTransition(tid(), subBranchIds[i - 1]!, subBranchIds[i]!),
        );
      }
      // Back to M (local sub-hub) then M→G→H for the return path.
      transitions.push(mkTransition(tid(), subBranchIds[size - 1]!, "M"));
    }
    // Close the outer SCC: M → G → H (return path).
    transitions.push(mkTransition(tid(), "M", "G"));
    transitions.push(mkTransition(tid(), "G", "H"));

    // Verify this all forms one SCC via primary pass.
    const primary = chunkStateMachine(states, transitions);
    const bigScc = primary.chunks.find(
      (c) => c.stateIds.length > 150 && c.stateIds.includes("H"),
    );
    expect(bigScc).toBeDefined();

    const result = decomposeGiantSCC(states, transitions, bigScc!, {
      rootStateId: "H",
      subChunkMax: 40,
    });

    expect(result.method).toBe("dominator");
    expect(result.degenerate).toBe(false);

    // With the algorithmic-progress guards (no depth cap), every sub-chunk
    // produced by a 2-level branching structure should fit under
    // `subChunkMax = 40` because each recursion strictly shrinks the largest
    // candidate before it gets accepted.
    for (const sc of result.subChunks) {
      expect(sc.stateIds.length).toBeLessThanOrEqual(40);
    }

    // Coverage.
    const covered = new Set<string>();
    for (const sc of result.subChunks) {
      for (const sid of sc.stateIds) covered.add(sid);
    }
    expect(covered).toEqual(new Set(bigScc!.stateIds));
  });
});

// =============================================================================
// Case 4 — Weak-bridge detection
// =============================================================================

describe("decomposeGiantSCC — weak-bridge detection", () => {
  it("two clusters joined by a single undirected edge: bridge detected", () => {
    // Cluster A: 3-cycle a1 → a2 → a3 → a1.
    // Cluster B: 3-cycle b1 → b2 → b3 → b1.
    // Bridge: a1 → b1 (and b1 → a1 to make the whole thing an SCC).
    // Undirected skeleton has a single bridge: {a1, b1}.
    const ids = ["a1", "a2", "a3", "b1", "b2", "b3"];
    const states = ids.map((id) => mkState(id));
    const transitions = [
      mkTransition("t_a12", "a1", "a2"),
      mkTransition("t_a23", "a2", "a3"),
      mkTransition("t_a31", "a3", "a1"),
      mkTransition("t_b12", "b1", "b2"),
      mkTransition("t_b23", "b2", "b3"),
      mkTransition("t_b31", "b3", "b1"),
      mkTransition("t_bridge_ab", "a1", "b1"),
      mkTransition("t_bridge_ba", "b1", "a1"),
    ];

    // subChunkMax: 1 bypasses the base case so this small fixture still
    // exercises bridge detection. (In production, the function is only
    // called for chunks > 150 states, so the base case is rarely hit.)
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {
      subChunkMax: 1,
    });

    // Both directions of the single connecting edge map to the same undirected
    // skeleton edge (a1, b1), which is a bridge.
    expect(result.weakBridgeTransitionIds.has("t_bridge_ab")).toBe(true);
    expect(result.weakBridgeTransitionIds.has("t_bridge_ba")).toBe(true);

    // None of the intra-cluster transitions are bridges — each is part of a
    // 3-cycle.
    expect(result.weakBridgeTransitionIds.has("t_a12")).toBe(false);
    expect(result.weakBridgeTransitionIds.has("t_b23")).toBe(false);
  });
});

// =============================================================================
// Case 5 — K5 clique: no bridges
// =============================================================================

describe("decomposeGiantSCC — K5 clique", () => {
  it("complete 5-node directed graph has no structural bridges", () => {
    const ids = ["v1", "v2", "v3", "v4", "v5"];
    const states = ids.map((id) => mkState(id));
    const transitions: StateMachineTransition[] = [];
    let tCounter = 0;
    for (const u of ids) {
      for (const v of ids) {
        if (u === v) continue;
        transitions.push(mkTransition(`t${tCounter++}`, u, v));
      }
    }
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {});
    expect(result.weakBridgeTransitionIds.size).toBe(0);
  });
});

// =============================================================================
// Case 6 — Stability under permutation
// =============================================================================

describe("decomposeGiantSCC — stability", () => {
  it("permuting input state order yields identical sub-chunk ids + bridges", () => {
    // Reuse the hub+bridge structure from Case 4 (giving us non-trivial
    // sub-chunks + a deterministic bridge).
    const idsA = ["a1", "a2", "a3", "b1", "b2", "b3"];
    const idsB = ["b3", "a2", "b1", "a1", "b2", "a3"]; // shuffled
    const idsC = idsA.slice().reverse();

    const buildTransitions = () => [
      mkTransition("t_a12", "a1", "a2"),
      mkTransition("t_a23", "a2", "a3"),
      mkTransition("t_a31", "a3", "a1"),
      mkTransition("t_b12", "b1", "b2"),
      mkTransition("t_b23", "b2", "b3"),
      mkTransition("t_b31", "b3", "b1"),
      mkTransition("t_bridge_ab", "a1", "b1"),
      mkTransition("t_bridge_ba", "b1", "a1"),
    ];

    // subChunkMax: 1 to bypass the base case for this small synthetic
    // fixture and exercise the dominator + bridge code paths.
    const run = (order: string[]) =>
      decomposeGiantSCC(
        order.map((id) => mkState(id)),
        buildTransitions(),
        mkChunk(order),
        { subChunkMax: 1 },
      );

    const rA = run(idsA);
    const rB = run(idsB);
    const rC = run(idsC);

    const subIds = (r: ReturnType<typeof run>) =>
      r.subChunks.map((c) => c.id).sort();

    expect(subIds(rA)).toEqual(subIds(rB));
    expect(subIds(rA)).toEqual(subIds(rC));

    const bridgeSetArr = (r: ReturnType<typeof run>) =>
      Array.from(r.weakBridgeTransitionIds).sort();
    expect(bridgeSetArr(rA)).toEqual(bridgeSetArr(rB));
    expect(bridgeSetArr(rA)).toEqual(bridgeSetArr(rC));
  });
});

// =============================================================================
// Case 7 — Degenerate K_{n,n} complete bipartite
// =============================================================================

describe("decomposeGiantSCC — degenerate K_{n,n}", () => {
  it("complete bipartite: every node dominates only itself → degenerate", () => {
    // K_{4,4}: a1..a4 on one side, b1..b4 on the other. Every a_i → b_j AND
    // b_j → a_i. Under any root r, every other node has at least 2
    // node-disjoint paths from r (via any other neighbor), so nobody
    // dominates anyone. All non-root nodes are direct children of root in
    // the dominator tree.
    //
    // With n nodes in the SCC, that means: root hub + (n-1) singleton
    // branches. That's n sub-chunks, which is NOT degenerate by the
    // `subChunks.length <= 1` rule but IS structurally useless — the
    // decomposition just listed every state.
    //
    // To actually get degenerate == true we need to pick a scenario where
    // only one branch exists. A simpler K_{n,n} is 2 sides of size 1: just
    // an a↔b pair. There, root=a (or b after tie-break), and the other
    // node is the only branch → 2 sub-chunks (hub + branch), NOT degenerate.
    //
    // Simplest genuinely-degenerate case: a single node with self-loop,
    // which collapses trivially. Or, with more nodes, a graph where the
    // root has NO children in the dominator tree — impossible inside an
    // SCC where other nodes are reachable.
    //
    // So: assert subChunks.length >= 2 here (every node surfaces) but
    // verify that none of the branches themselves are further decomposable
    // — the structure is flat. Test the "flatness" property.
    const sideA = ["a1", "a2", "a3", "a4"];
    const sideB = ["b1", "b2", "b3", "b4"];
    const ids = [...sideA, ...sideB];
    const states = ids.map((id) => mkState(id));
    const transitions: StateMachineTransition[] = [];
    let tCounter = 0;
    for (const a of sideA) {
      for (const b of sideB) {
        transitions.push(mkTransition(`tab${tCounter++}`, a, b));
        transitions.push(mkTransition(`tba${tCounter++}`, b, a));
      }
    }
    // subChunkMax: 1 to bypass the base case so the decomposition actually
    // runs on this 8-node fixture.
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {
      subChunkMax: 1,
    });

    // Every non-root node is its own dominator subtree (size 1). So we get
    // 1 hub sub-chunk of size 1 + (n-1) singleton branch sub-chunks.
    // That's 8 sub-chunks all of size 1.
    expect(result.subChunks.length).toBe(8);
    for (const sc of result.subChunks) {
      expect(sc.stateIds.length).toBe(1);
    }
    // In K_{n,n}, every undirected edge is on multiple cycles (any a-b-a'-b'
    // path) → no bridges.
    expect(result.weakBridgeTransitionIds.size).toBe(0);
    // `degenerate` is false here by our definition (>1 sub-chunks), but the
    // UI should still show the panel because the sub-chunks are all
    // singletons — that's a UX concern, handled in Phase 4.
    expect(result.degenerate).toBe(false);
  });

  it("2-state K_{1,1} forced past base case: 2 singleton sub-chunks", () => {
    const ids = ["a", "b"];
    const states = ids.map((id) => mkState(id));
    const transitions = [
      mkTransition("tab", "a", "b"),
      mkTransition("tba", "b", "a"),
    ];
    // subChunkMax: 1 to force decomposition past the base case.
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {
      subChunkMax: 1,
    });
    // a is root (lex-first with equal in-deg 1). b is a's only dom-child.
    // Hub + 1 branch = 2 sub-chunks.
    expect(result.subChunks.length).toBe(2);
    expect(result.degenerate).toBe(false);
  });

  it("2-state input under default subChunkMax → base case → degenerate", () => {
    // Production callers always invoke with the default subChunkMax=40 and
    // only on chunks > 150 states, so this is the realistic path: a 2-state
    // input never even reaches the dominator code.
    const ids = ["a", "b"];
    const states = ids.map((id) => mkState(id));
    const transitions = [
      mkTransition("tab", "a", "b"),
      mkTransition("tba", "b", "a"),
    ];
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {});
    expect(result.degenerate).toBe(true);
    expect(result.subChunks).toHaveLength(0);
  });
});

// =============================================================================
// Case 8 — Termination guards (no depth cap)
// =============================================================================

describe("decomposeGiantSCC — termination without depth cap", () => {
  it("slow-shrinkage chain (root → only-child → only-grandchild → …) terminates", () => {
    // Build an SCC where every non-leaf node has exactly one forward dominator
    // child: a long linear path with a back-edge to make it strongly connected.
    //   s0 → s1 → s2 → ... → s199
    //   s199 → s0 (closes the cycle)
    // Dominator from s0: idom(s_i) = s_{i-1} for all i > 0. So at each level
    // the recursion gets exactly one branch of size n-1. With depth cap gone,
    // the only thing stopping recursion is `n <= subChunkMax` (the base case)
    // + Guard 2 (post-recursion progress check). Recursion depth = n / 1 =
    // ~n levels in the worst case; should still terminate without stack
    // overflow for n=200 and produce coverage of all states.
    const N = 200;
    const ids: string[] = [];
    const states: StateMachineState[] = [];
    const transitions: StateMachineTransition[] = [];
    for (let i = 0; i < N; i++) {
      const sid = `s${String(i).padStart(3, "0")}`;
      ids.push(sid);
      states.push(mkState(sid));
    }
    for (let i = 1; i < N; i++) {
      transitions.push(mkTransition(`t${i}`, ids[i - 1]!, ids[i]!));
    }
    transitions.push(mkTransition("tback", ids[N - 1]!, ids[0]!));

    const start = Date.now();
    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {
      rootStateId: ids[0]!,
      subChunkMax: 40,
    });
    const elapsed = Date.now() - start;

    // Must complete in well under a second even for n=200 with worst-case
    // shrinkage. (Empirically ~10–50ms.)
    expect(elapsed).toBeLessThan(1000);

    // All states accounted for.
    const covered = new Set<string>();
    for (const sc of result.subChunks) {
      for (const sid of sc.stateIds) covered.add(sid);
    }
    expect(covered).toEqual(new Set(ids));

    // The largest sub-chunk must be ≤ subChunkMax — otherwise recursion
    // didn't actually shrink to leaves.
    let maxSize = 0;
    for (const sc of result.subChunks) {
      if (sc.stateIds.length > maxSize) maxSize = sc.stateIds.length;
    }
    expect(maxSize).toBeLessThanOrEqual(40);
  });

  it("post-recursion progress check rejects no-shrink inner results", () => {
    // Construct a scenario where the inner recursion *might* return a result
    // whose largest sub-chunk equals the parent input size. We use a 60-state
    // graph that is structurally a single chain — top-level partition gives
    // one branch of size 59 (root + chain of 59). Recursing on the 59-state
    // branch produces root + chain of 58, and so on. Without Guard 2, you
    // could imagine a buggy recursion accepting a "no-progress" result —
    // verify that the final output has every sub-chunk ≤ subChunkMax (i.e.
    // recursion ultimately reached the base case rather than getting stuck).
    const N = 60;
    const ids: string[] = [];
    const states: StateMachineState[] = [];
    const transitions: StateMachineTransition[] = [];
    for (let i = 0; i < N; i++) {
      const sid = `c${String(i).padStart(2, "0")}`;
      ids.push(sid);
      states.push(mkState(sid));
    }
    for (let i = 1; i < N; i++) {
      transitions.push(mkTransition(`t${i}`, ids[i - 1]!, ids[i]!));
    }
    transitions.push(mkTransition("tback", ids[N - 1]!, ids[0]!));

    const result = decomposeGiantSCC(states, transitions, mkChunk(ids), {
      rootStateId: ids[0]!,
      subChunkMax: 20,
    });

    expect(result.degenerate).toBe(false);
    // No sub-chunk above subChunkMax — i.e. recursion did terminate by
    // shrinking each branch to fit, not by getting bored.
    for (const sc of result.subChunks) {
      expect(sc.stateIds.length).toBeLessThanOrEqual(20);
    }
  });
});
