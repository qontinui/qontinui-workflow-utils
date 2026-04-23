/**
 * Unit tests for chunkStateMachine() — the Phase 1 pure SCC + chain
 * compaction utility.
 *
 * Covers:
 *   - Basic decompositions (linear chain, diamond, 3-cycle, self-loop).
 *   - Self-loop + chain interaction (the singleton-self-loop regression).
 *   - Disconnected subgraphs.
 *   - Stable chunk ids under state input permutation.
 *   - Large synthetic fixture (the 201-state `runner-state-machine.json`
 *     on disk has an incompatible v1 schema — it uses
 *     `id`/`requiredElements` rather than `state_id`/`element_ids` — so we
 *     generate a synthetic fixture programmatically instead, and export
 *     the generator for reuse by the Phase 7 stress test).
 *   - Synthetic 1000-state stress test.
 */

import { describe, it, expect } from "vitest";
import type {
  StateMachineState,
  StateMachineTransition,
} from "@qontinui/shared-types";
import { chunkStateMachine } from "./scc";

// =============================================================================
// Test helpers
// =============================================================================

/**
 * Construct a minimal StateMachineState with sensible defaults. Tests only
 * care about `state_id`, `name`, and `extra_metadata.initial`; the rest are
 * required by the type signature but irrelevant to chunking.
 */
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

/**
 * Construct a minimal StateMachineTransition with one from_state → one
 * activate_state edge.
 */
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

/**
 * Synthetic graph generator for large-scale tests. Produces N states:
 *
 *   - `sccCount` small 3-cycle SCCs (each 3 states).
 *   - A linear "backbone" of singletons connecting SCCs and filling the rest.
 *   - Each SCC has one incoming backbone edge and one outgoing backbone edge.
 *
 * Exported so the Phase 7 stress test can reuse it without committing a
 * multi-MB JSON fixture.
 */
export function generateSyntheticStateMachine(
  totalStates: number,
  sccCount: number,
): {
  states: StateMachineState[];
  transitions: StateMachineTransition[];
} {
  if (sccCount * 3 > totalStates) {
    throw new Error(
      `sccCount*3 (${sccCount * 3}) must be <= totalStates (${totalStates})`,
    );
  }

  const states: StateMachineState[] = [];
  const transitions: StateMachineTransition[] = [];
  let tCounter = 0;
  const nextTid = () => `t${tCounter++}`;

  // Backbone nodes: totalStates - sccCount*3 linear singletons.
  const backboneLen = totalStates - sccCount * 3;
  const backboneIds: string[] = [];
  for (let i = 0; i < backboneLen; i++) {
    const id = `bb-${i}`;
    backboneIds.push(id);
    states.push(mkState(id, { name: id, initial: i === 0 }));
    if (i > 0) {
      transitions.push(mkTransition(nextTid(), backboneIds[i - 1]!, id));
    }
  }

  // For each SCC, splice it into the backbone at an evenly-spaced point.
  // The SCC is a 3-cycle: s0 → s1 → s2 → s0, with an inbound edge from the
  // backbone splice point and an outbound edge to the next backbone node.
  for (let k = 0; k < sccCount; k++) {
    const s0 = `scc${k}-0`;
    const s1 = `scc${k}-1`;
    const s2 = `scc${k}-2`;
    states.push(mkState(s0, { name: s0 }));
    states.push(mkState(s1, { name: s1 }));
    states.push(mkState(s2, { name: s2 }));
    transitions.push(mkTransition(nextTid(), s0, s1));
    transitions.push(mkTransition(nextTid(), s1, s2));
    transitions.push(mkTransition(nextTid(), s2, s0));

    // Splice: pick a backbone node and make it branch into the SCC, with the
    // SCC also having an exit into the next backbone node. Spaced evenly.
    if (backboneLen >= 2) {
      const spliceAt = Math.floor(((k + 1) * backboneLen) / (sccCount + 1));
      const entry = backboneIds[Math.max(0, Math.min(backboneLen - 2, spliceAt))]!;
      const exit = backboneIds[Math.min(backboneLen - 1, spliceAt + 1)]!;
      transitions.push(mkTransition(nextTid(), entry, s0));
      transitions.push(mkTransition(nextTid(), s2, exit));
    }
  }

  return { states, transitions };
}

// =============================================================================
// Basic decomposition tests
// =============================================================================

describe("chunkStateMachine — basic decomposition", () => {
  it("linear chain of 5 states produces 1 chain chunk of size 5", () => {
    const states = ["A", "B", "C", "D", "E"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
      mkTransition("t3", "C", "D"),
      mkTransition("t4", "D", "E"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(1);
    const [chunk] = graph.chunks;
    expect(chunk!.kind).toBe("chain");
    expect(chunk!.stateIds).toEqual(["A", "B", "C", "D", "E"]);
    expect(chunk!.containsInitialState).toBe(true); // A is states[0]
    expect(graph.edges).toHaveLength(0);
  });

  it("diamond (A→B, A→C, B→D, C→D) produces 4 singleton chunks", () => {
    // B and C each have in-degree 1 from A (OK to chain in), but A has
    // out-degree 2 → can't start a chain into B or C. Likewise D has
    // in-degree 2 → can't be extended into. So all 4 nodes stay as
    // separate singleton chain chunks of size 1.
    const states = ["A", "B", "C", "D"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "A", "C"),
      mkTransition("t3", "B", "D"),
      mkTransition("t4", "C", "D"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(4);
    for (const chunk of graph.chunks) {
      expect(chunk.kind).toBe("chain"); // singleton, not a cycle
      expect(chunk.stateIds).toHaveLength(1);
    }
    // 4 cross-chunk edges
    expect(graph.edges).toHaveLength(4);
  });

  it("self-loop on a single state produces 1 SCC chunk of size 1", () => {
    const states = [mkState("A")];
    const transitions = [mkTransition("t1", "A", "A")];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(1);
    const [chunk] = graph.chunks;
    expect(chunk!.kind).toBe("scc"); // intrinsic cycle
    expect(chunk!.stateIds).toEqual(["A"]);
    // Self-loop is intra-chunk, not emitted
    expect(graph.edges).toHaveLength(0);
  });

  it("self-loop inside a chain splits the chain (singleton-self-loop regression)", () => {
    // A → B → C → D, with B → B (self-loop on B).
    // Expected: 3 chunks — chain [A], scc {B}, chain [C, D].
    // B is NOT chain-eligible (kind: "scc") and must not be swallowed into
    // either adjacent chain.
    const states = ["A", "B", "C", "D"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "B"), // self-loop
      mkTransition("t3", "B", "C"),
      mkTransition("t4", "C", "D"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(3);
    const byStateA = graph.chunks.find((c) => c.stateIds.includes("A"))!;
    const byStateB = graph.chunks.find((c) => c.stateIds.includes("B"))!;
    const byStateCD = graph.chunks.find((c) => c.stateIds.includes("C"))!;

    expect(byStateA.stateIds).toEqual(["A"]);
    expect(byStateA.kind).toBe("chain");

    expect(byStateB.kind).toBe("scc");
    expect(byStateB.stateIds).toEqual(["B"]);

    expect(byStateCD.stateIds).toEqual(["C", "D"]);
    expect(byStateCD.kind).toBe("chain");

    // Edges: A→{B}, {B}→[C,D]. That's 2 cross-chunk edges.
    expect(graph.edges).toHaveLength(2);
  });

  it("3-cycle (A→B→C→A) produces 1 SCC chunk of size 3", () => {
    const states = ["A", "B", "C"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
      mkTransition("t3", "C", "A"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(1);
    const [chunk] = graph.chunks;
    expect(chunk!.kind).toBe("scc");
    expect(chunk!.stateIds.slice().sort()).toEqual(["A", "B", "C"]);
    expect(graph.edges).toHaveLength(0);
  });

  it("two disconnected subgraphs produce disjoint chunks", () => {
    // Subgraph 1: A → B → C (chain of 3)
    // Subgraph 2: X → Y (chain of 2)
    const states = ["A", "B", "C", "X", "Y"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
      mkTransition("t3", "X", "Y"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.chunks).toHaveLength(2);
    const abc = graph.chunks.find((c) => c.stateIds.includes("A"))!;
    const xy = graph.chunks.find((c) => c.stateIds.includes("X"))!;
    expect(abc.stateIds).toEqual(["A", "B", "C"]);
    expect(xy.stateIds).toEqual(["X", "Y"]);
    expect(graph.edges).toHaveLength(0);
  });
});

// =============================================================================
// Stability — chunk ids must be independent of input order
// =============================================================================

describe("chunkStateMachine — stable chunk ids under state permutation", () => {
  it("permuting states[] yields identical chunk id set", () => {
    // Use a mix of structures: a chain, an SCC, a self-loop singleton.
    const baseIds = ["A", "B", "C", "X", "Y", "Z", "P"];
    const buildTransitions = () => [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
      mkTransition("t3", "X", "Y"),
      mkTransition("t4", "Y", "Z"),
      mkTransition("t5", "Z", "X"), // 3-cycle
      mkTransition("t6", "P", "P"), // self-loop
      mkTransition("t7", "C", "X"), // bridge chain → SCC
    ];

    const order1 = baseIds;
    const order2 = ["P", "Y", "A", "X", "C", "B", "Z"];
    const order3 = baseIds.slice().reverse();

    const idSet = (order: string[]) => {
      const g = chunkStateMachine(
        order.map((id) => mkState(id)),
        buildTransitions(),
      );
      return new Set(g.chunks.map((c) => c.id));
    };

    const s1 = idSet(order1);
    const s2 = idSet(order2);
    const s3 = idSet(order3);

    expect(s1).toEqual(s2);
    expect(s1).toEqual(s3);
    // Sanity: all three orderings produced at least 2 chunks.
    expect(s1.size).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Initial-state badge
// =============================================================================

describe("chunkStateMachine — initial state badge", () => {
  it("options.initialStateId takes priority over metadata", () => {
    const states = [
      mkState("A", { initial: true }),
      mkState("B"),
      mkState("C"),
    ];
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
    ];

    const graph = chunkStateMachine(states, transitions, {
      initialStateId: "C",
    });

    const chunk = graph.chunks[0]!;
    expect(chunk.stateIds).toContain("C");
    expect(chunk.containsInitialState).toBe(true);
  });

  it("falls back to extra_metadata.initial when options unset", () => {
    const states = [mkState("A"), mkState("B", { initial: true })];
    const transitions = [mkTransition("t1", "A", "B")];

    const graph = chunkStateMachine(states, transitions);

    const chunk = graph.chunks[0]!;
    expect(chunk.containsInitialState).toBe(true);
  });

  it("falls back to states[0] when no initial metadata or option", () => {
    const states = [mkState("A"), mkState("B")];
    const transitions = [mkTransition("t1", "A", "B")];

    const graph = chunkStateMachine(states, transitions);

    const chunk = graph.chunks[0]!;
    expect(chunk.stateIds[0]).toBe("A");
    expect(chunk.containsInitialState).toBe(true);
  });
});

// =============================================================================
// Chunk naming
// =============================================================================

describe("chunkStateMachine — chunk naming", () => {
  it("singleton chunk uses the state name", () => {
    const states = [
      mkState("A", { name: "Login Page" }),
      mkState("B"),
      mkState("C"),
    ];
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "A", "C"), // A has out-deg 2, stays singleton
    ];

    const graph = chunkStateMachine(states, transitions);
    const chunkA = graph.chunks.find((c) => c.stateIds[0] === "A")!;
    expect(chunkA.name).toBe("Login Page");
  });

  it("short chain uses 'first → last' format", () => {
    const states = ["A", "B", "C"].map((id) =>
      mkState(id, { name: `State_${id}` }),
    );
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
    ];

    const graph = chunkStateMachine(states, transitions);
    const chunk = graph.chunks[0]!;
    expect(chunk.name).toBe("State_A → State_C");
  });

  it("long chain (>5) uses 'first → … → last' format", () => {
    const ids = ["s1", "s2", "s3", "s4", "s5", "s6"];
    const states = ids.map((id) => mkState(id, { name: id }));
    const transitions = ids.slice(1).map((id, i) =>
      mkTransition(`t${i}`, ids[i]!, id),
    );

    const graph = chunkStateMachine(states, transitions);
    const chunk = graph.chunks[0]!;
    expect(chunk.name).toBe("s1 → … → s6");
  });

  it("SCC with common dash-prefix uses '{prefix}-*' name", () => {
    const states = [
      mkState("x", { name: "loading-initial" }),
      mkState("y", { name: "loading-data" }),
      mkState("z", { name: "loading-ready" }),
    ];
    // 3-cycle
    const transitions = [
      mkTransition("t1", "x", "y"),
      mkTransition("t2", "y", "z"),
      mkTransition("t3", "z", "x"),
    ];

    const graph = chunkStateMachine(states, transitions);
    const chunk = graph.chunks[0]!;
    expect(chunk.kind).toBe("scc");
    expect(chunk.name).toBe("loading-*");
  });

  it("SCC without common prefix uses fallback '{n} states: ...' name", () => {
    const states = [
      mkState("a", { name: "AlphaOne" }),
      mkState("b", { name: "BetaTwo" }),
      mkState("c", { name: "GammaThree" }),
    ];
    const transitions = [
      mkTransition("t1", "a", "b"),
      mkTransition("t2", "b", "c"),
      mkTransition("t3", "c", "a"),
    ];

    const graph = chunkStateMachine(states, transitions);
    const chunk = graph.chunks[0]!;
    expect(chunk.name).toContain("3 states:");
    expect(chunk.name).toContain("AlphaOne");
  });
});

// =============================================================================
// Edge aggregation
// =============================================================================

describe("chunkStateMachine — edge aggregation", () => {
  it("deduplicates parallel cross-chunk edges and preserves transition ids", () => {
    // A → B, A → B (two transitions, same endpoints) + B → C.
    // A and B can't merge (A has out-deg 1 to B but B's in-deg is counted as 1 in the
    // condensation because parallel edges collapse at the SCC level). B → C is separate chain.
    // Actually: A → B has 2 raw edges, both within the same (fromChunk, toChunk)
    // after chunking. If A and B merge, the A→B edges become intra-chunk and don't appear.
    // Use separate chunks by giving A another outgoing edge.
    const states = ["A", "B", "C", "D"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "A", "B"), // parallel edge
      mkTransition("t3", "A", "D"), // forces A to be its own chunk (out-deg 2)
      mkTransition("t4", "B", "C"),
    ];

    const graph = chunkStateMachine(states, transitions);

    // Find the edge from A's chunk to B's chunk.
    const chunkA = graph.chunks.find((c) => c.stateIds.includes("A"))!;
    const chunkB = graph.chunks.find((c) => c.stateIds.includes("B"))!;
    // B might be merged with C (chain [B, C]); check.
    const edgeAB = graph.edges.find(
      (e) => e.from === chunkA.id && e.to === chunkB.id,
    )!;
    expect(edgeAB).toBeDefined();
    expect(edgeAB.transitionCount).toBe(2);
    expect(edgeAB.transitionIds.slice().sort()).toEqual(["t1", "t2"]);
  });

  it("builds stateIndex mapping every state to its chunk id", () => {
    const states = ["A", "B", "C"].map((id) => mkState(id));
    const transitions = [
      mkTransition("t1", "A", "B"),
      mkTransition("t2", "B", "C"),
    ];

    const graph = chunkStateMachine(states, transitions);

    expect(graph.stateIndex.get("A")).toBe(graph.chunks[0]!.id);
    expect(graph.stateIndex.get("B")).toBe(graph.chunks[0]!.id);
    expect(graph.stateIndex.get("C")).toBe(graph.chunks[0]!.id);
  });
});

// =============================================================================
// Large synthetic fixture — regression moat
// =============================================================================

describe("chunkStateMachine — large synthetic fixture", () => {
  it("synthetic 400-state graph compresses well (chunks<150, max chunk<150)", () => {
    // NOTE: the on-disk fixture at D:\qontinui-root\runner-state-machine.json
    // is a v1 schema (uses `id`/`requiredElements`) — incompatible with the
    // current @qontinui/shared-types `state_id`/`element_ids` interface.
    // Rather than ship an adapter, we generate a synthetic graph with a
    // shape representative of real-world state machines: a long backbone
    // of linear singletons plus a handful of small SCCs. The Phase 7
    // stress test reuses `generateSyntheticStateMachine` for the 1000-
    // state case.
    const { states, transitions } = generateSyntheticStateMachine(400, 8);
    expect(states).toHaveLength(400);

    const graph = chunkStateMachine(states, transitions);

    // Every state maps to exactly one chunk.
    expect(graph.stateIndex.size).toBe(400);

    // No chunk overlaps.
    const seen = new Set<string>();
    for (const chunk of graph.chunks) {
      for (const sid of chunk.stateIds) {
        expect(seen.has(sid)).toBe(false);
        seen.add(sid);
      }
    }
    expect(seen.size).toBe(400);

    // Compression budget: chunks < 150, largest chunk < 150.
    expect(graph.chunks.length).toBeLessThan(150);
    const maxChunkSize = Math.max(...graph.chunks.map((c) => c.stateIds.length));
    expect(maxChunkSize).toBeLessThan(150);
  });
});

// =============================================================================
// 1000-state stress test
// =============================================================================

describe("chunkStateMachine — 1000-state stress", () => {
  it("completes on a synthetic 1000-state graph with reasonable compression", () => {
    const { states, transitions } = generateSyntheticStateMachine(1000, 20);
    expect(states).toHaveLength(1000);

    const start = Date.now();
    const graph = chunkStateMachine(states, transitions);
    const elapsed = Date.now() - start;

    // Sanity — should be well under a second on any dev machine.
    expect(elapsed).toBeLessThan(5000);

    // Coverage: all 1000 states represented.
    expect(graph.stateIndex.size).toBe(1000);

    // Compression ratio: 1000 → under 200 chunks. The 20 SCCs + ~940
    // backbone singletons should fold into roughly one big chain chunk
    // split by SCC splices, so chunks <= (number of splices + 1) +
    // number of sccs = (1 + 20 + 1) + 20 in a naive bound, but real
    // chain compaction plus diamond breakage brings it much lower.
    expect(graph.chunks.length).toBeLessThan(200);
    expect(graph.chunks.length).toBeGreaterThan(0);
  });
});
