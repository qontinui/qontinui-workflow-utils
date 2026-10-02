/**
 * Unit tests for instantiateSkill()'s template dispatch: only single_step and
 * multi_step templates produce steps, and any other kind — a `playbook`, which
 * carries domain knowledge rather than steps — is refused with a named error
 * instead of being read as multi-step (which would map over `undefined`).
 */

import { describe, expect, it } from "vitest";
import type { SkillDefinition } from "@qontinui/shared-types/workflow";
import { instantiateSkill } from "./skill-instantiation";

function skill(template: unknown): SkillDefinition {
  return {
    id: "s1",
    name: "Example",
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
