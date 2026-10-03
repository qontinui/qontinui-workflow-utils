/**
 * Unit tests for instantiateSkill()'s template dispatch: only single_step and
 * multi_step templates produce steps, and any other kind — a `playbook`, which
 * carries domain knowledge rather than steps — is refused with a named error
 * instead of being read as multi-step (which would map over `undefined`).
 */

import { afterEach, describe, expect, it } from "vitest";
import type { SkillDefinition } from "@qontinui/shared-types/workflow";
import {
  instantiateComposition,
  instantiateSkill,
  instantiateSkillSteps,
  skillProducesSteps,
} from "./skill-instantiation";
import { clearUserSkills, registerUserSkills } from "./skill-registry";

function skill(
  template: unknown,
  id = "s1",
  extra: Partial<SkillDefinition> = {},
): SkillDefinition {
  return {
    id,
    name: id === "s1" ? "Example" : id,
    slug: "example",
    description: "",
    category: "custom",
    tags: [],
    icon: "",
    color: "",
    allowed_phases: ["setup"],
    parameters: [],
    template,
    source: "user",
    ...extra,
  } as unknown as SkillDefinition;
}

describe("instantiateSkill template dispatch", () => {
  it("expands a single_step template into one step", () => {
    const steps = instantiateSkill(
      skill({ kind: "single_step", step: { type: "command", command: "ls" } }),
      "setup",
      {},
    );
    expect(steps).toHaveLength(1);
  });

  it("expands a multi_step template into one step per entry", () => {
    const steps = instantiateSkill(
      skill({
        kind: "multi_step",
        steps: [
          { type: "command", command: "a" },
          { type: "command", command: "b" },
        ],
      }),
      "setup",
      {},
    );
    expect(steps).toHaveLength(2);
  });

  it("refuses a playbook template by name", () => {
    expect(() =>
      instantiateSkill(
        skill({ kind: "playbook", content: "# notes", triggers: [] }),
        "setup",
        {},
      ),
    ).toThrow('has a "playbook" template, which produces no workflow steps');
  });
});

const single = (command: string) => ({
  kind: "single_step",
  step: { type: "command", command },
});
const composition = (...ids: string[]) => ({
  kind: "composition",
  skill_refs: ids.map((skill_id) => ({ skill_id, parameter_overrides: {} })),
});
const playbook = { kind: "playbook", content: "", triggers: [] };
const commands = (steps: unknown[]) =>
  steps.map((s) => (s as { command: string }).command);

describe("skillProducesSteps", () => {
  afterEach(() => clearUserSkills());

  it("accepts step templates and a composition whose refs all produce steps", () => {
    registerUserSkills([skill(single("a"), "a"), skill(composition("a"), "ca")]);
    expect(skillProducesSteps(skill(single("ls")))).toBe(true);
    expect(skillProducesSteps(skill({ kind: "multi_step", steps: [] }))).toBe(
      true,
    );
    expect(skillProducesSteps(skill(composition("a", "ca"), "outer"))).toBe(
      true,
    );
  });

  it("rejects a playbook and an unknown kind", () => {
    expect(skillProducesSteps(skill(playbook))).toBe(false);
    expect(skillProducesSteps(skill({ kind: "from_the_future" }))).toBe(false);
  });

  it("rejects a composition that can never expand", () => {
    registerUserSkills([skill(playbook, "p"), skill(composition("x"), "x")]);
    expect(skillProducesSteps(skill(composition("p"), "c1"))).toBe(false);
    expect(skillProducesSteps(skill(composition("missing"), "c2"))).toBe(false);
    expect(skillProducesSteps(skill(composition("x"), "x"))).toBe(false);
  });
});

describe("instantiateSkillSteps / instantiateComposition", () => {
  afterEach(() => clearUserSkills());

  it("routes a composition through its refs, in order", () => {
    registerUserSkills([skill(single("a"), "a"), skill(single("b"), "b")]);
    const steps = instantiateSkillSteps(
      skill(composition("a", "b"), "ab"),
      "setup",
      {},
    );
    expect(commands(steps)).toEqual(["a", "b"]);
  });

  it("routes a step template through instantiateSkill", () => {
    expect(
      commands(instantiateSkillSteps(skill(single("ls")), "setup", {})),
    ).toEqual(["ls"]);
  });

  it("refuses an unknown template kind", () => {
    expect(() =>
      instantiateSkillSteps(skill({ kind: "from_the_future" }), "setup", {}),
    ).toThrow('has a "from_the_future" template');
  });

  it("expands a composition that references another composition", () => {
    registerUserSkills([
      skill(single("a"), "a"),
      skill(single("b"), "b"),
      skill(composition("a", "b"), "ab"),
    ]);
    const steps = instantiateComposition(
      skill(composition("ab", "a"), "outer"),
      "setup",
      {},
    );
    expect(commands(steps)).toEqual(["a", "b", "a"]);
  });

  it("refuses a self-referencing composition", () => {
    registerUserSkills([skill(composition("x"), "x")]);
    expect(() =>
      instantiateComposition(skill(composition("x"), "x"), "setup", {}),
    ).toThrow("composition cycle: x -> x");
  });

  it("refuses a cycle entered below the root", () => {
    registerUserSkills([
      skill(composition("y"), "x"),
      skill(composition("x"), "y"),
    ]);
    expect(() =>
      instantiateComposition(skill(composition("x"), "outer"), "setup", {}),
    ).toThrow("composition cycle: outer -> x -> y -> x");
  });

  it("names the composition when a ref is a playbook", () => {
    registerUserSkills([skill(playbook, "p")]);
    expect(() =>
      instantiateSkillSteps(skill(composition("p"), "c"), "setup", {}),
    ).toThrow('In composition "c": Skill "p" has a "playbook" template');
  });

  it("enforces the composition's own allowed_phases", () => {
    registerUserSkills([
      skill(single("a"), "a", { allowed_phases: ["setup", "completion"] }),
    ]);
    expect(() =>
      instantiateComposition(
        skill(composition("a"), "c", { allowed_phases: ["setup"] }),
        "completion",
        {},
      ),
    ).toThrow('Skill "c" is not allowed in phase "completion"');
  });

  it("passes the composition's parameter defaults to its refs", () => {
    registerUserSkills([
      skill(single("{{cmd}}"), "a", {
        parameters: [{ name: "cmd", label: "Cmd", type: "string" }],
      } as Partial<SkillDefinition>),
    ]);
    const outer = skill(composition("a"), "c", {
      parameters: [
        { name: "cmd", label: "Cmd", type: "string", default: "from-default" },
      ],
    } as Partial<SkillDefinition>);
    expect(commands(instantiateComposition(outer, "setup", {}))).toEqual([
      "from-default",
    ]);
    expect(
      commands(instantiateComposition(outer, "setup", { cmd: "given" })),
    ).toEqual(["given"]);
  });

  it("names the composition when a nested ref is missing", () => {
    registerUserSkills([skill(composition("missing"), "inner")]);
    expect(() =>
      instantiateComposition(skill(composition("inner"), "outer"), "setup", {}),
    ).toThrow(
      'In composition "outer": In composition "inner": referenced skill not found: missing',
    );
  });

  it("enforces the composition's own depends_on", () => {
    registerUserSkills([skill(single("a"), "a")]);
    expect(() =>
      instantiateComposition(
        skill(composition("a"), "c", { depends_on: ["absent"] }),
        "setup",
        {},
      ),
    ).toThrow('Skill "c" has missing dependencies: absent');
  });
});
