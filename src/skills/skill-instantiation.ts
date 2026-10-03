/**
 * Skill Instantiation
 *
 * Resolves a skill template + parameter values into concrete workflow step(s).
 * This is the core "skill → step" transformation.
 *
 * Parameter placeholders in templates use the {{name}} syntax and are replaced
 * with actual values at instantiation time.
 */

import type {
  SkillDefinition,
  SkillOrigin,
  UnifiedStep,
  WorkflowPhase,
} from "@qontinui/shared-types/workflow";
import { getSkill } from "./skill-registry";

// =============================================================================
// Dependency Validation
// =============================================================================

/**
 * Validate that all skill dependencies are available in the registry.
 * Returns an array of missing dependency IDs (empty if all are satisfied).
 */
export function validateDependencies(skill: SkillDefinition): string[] {
  if (!skill.depends_on || skill.depends_on.length === 0) return [];

  return skill.depends_on.filter((depId) => !getSkill(depId));
}

// =============================================================================
// Parameter Resolution
// =============================================================================

/**
 * Resolve {{placeholder}} strings in a template value.
 *
 * Rules:
 * - String values matching "{{name}}" exactly are replaced with the parameter
 *   value (preserving its type — number, boolean, etc.)
 * - String values containing "{{name}}" within other text are interpolated
 *   as strings.
 * - Undefined/missing parameter values remove the key from the output
 *   (optional fields become absent, not null).
 */
function resolveValue(
  value: unknown,
  params: Record<string, unknown>,
): unknown {
  if (typeof value === "string") {
    // Exact placeholder match: "{{name}}" → replace with typed value
    const exactMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (exactMatch) {
      const paramName = exactMatch[1];
      return params[paramName];
    }

    // Inline placeholder interpolation: "prefix {{name}} suffix"
    if (value.includes("{{")) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
        const resolved = params[paramName];
        return resolved !== undefined && resolved !== null
          ? String(resolved)
          : "";
      });
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, params));
  }

  if (value !== null && typeof value === "object") {
    return resolveObject(value as Record<string, unknown>, params);
  }

  return value;
}

/**
 * Resolve all placeholders in an object, removing keys whose resolved
 * value is undefined (parameter not provided and no default).
 */
function resolveObject(
  obj: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const resolved = resolveValue(value, params);
    // Omit keys with undefined values (optional params not provided)
    if (resolved !== undefined) {
      result[key] = resolved;
    }
  }
  return result;
}

// =============================================================================
// Instantiation
// =============================================================================

/**
 * Build the effective parameter values by merging user-provided values
 * over skill defaults.
 */
function buildEffectiveParams(
  skill: SkillDefinition,
  paramValues: Record<string, unknown>,
): Record<string, unknown> {
  const effective: Record<string, unknown> = {};
  for (const param of skill.parameters) {
    const userValue = paramValues[param.name];
    if (userValue !== undefined && userValue !== null && userValue !== "") {
      effective[param.name] = userValue;
    } else if (param.default !== undefined) {
      effective[param.name] = param.default;
    }
    // If neither provided nor has default, the key stays absent
  }
  return effective;
}

/**
 * Instantiate a skill into concrete workflow step(s).
 *
 * @param skill - The skill definition to instantiate
 * @param phase - The workflow phase to assign to the produced step(s)
 * @param paramValues - User-provided parameter values
 * @returns Array of concrete steps ready to insert into a workflow
 */
export function instantiateSkill(
  skill: SkillDefinition,
  phase: WorkflowPhase,
  paramValues: Record<string, unknown>,
): UnifiedStep[] {
  if (skill.template.kind === "composition") {
    throw new Error(
      `Skill "${skill.name}" is a composition skill and cannot be directly instantiated; use instantiateSkillSteps or instantiateComposition`,
    );
  }

  // Decide the template first, so a skill that can never produce steps is
  // refused for that reason rather than for a parameter error. Only
  // step-producing templates get past here. Anything else (a `playbook`,
  // which injects domain knowledge into prompts and carries no steps, or a
  // kind this build does not know) is refused rather than read as multi-step.
  const template = skill.template;
  let templateSteps: Record<string, unknown>[];
  if (template.kind === "single_step") {
    templateSteps = [template.step];
  } else if (template.kind === "multi_step") {
    templateSteps = template.steps;
  } else {
    throw new Error(
      `Skill "${skill.name}" has a "${(template as { kind: string }).kind}" template, which produces no workflow steps`,
    );
  }

  if (!skill.allowed_phases.includes(phase)) {
    throw new Error(
      `Skill "${skill.name}" is not allowed in phase "${phase}". ` +
        `Allowed phases: ${skill.allowed_phases.join(", ")}`,
    );
  }

  const missingDeps = validateDependencies(skill);
  if (missingDeps.length > 0) {
    throw new Error(
      `Skill "${skill.name}" has missing dependencies: ${missingDeps.join(", ")}`,
    );
  }

  const effectiveParams = buildEffectiveParams(skill, paramValues);

  // Validate parameters
  for (const param of skill.parameters) {
    const val = effectiveParams[param.name];
    if (val === undefined) continue;

    if (param.min !== undefined && typeof val === "number" && val < param.min) {
      throw new Error(
        `Parameter "${param.name}" value ${val} is below minimum ${param.min}`,
      );
    }
    if (param.max !== undefined && typeof val === "number" && val > param.max) {
      throw new Error(
        `Parameter "${param.name}" value ${val} exceeds maximum ${param.max}`,
      );
    }
    if (param.pattern !== undefined && typeof val === "string") {
      const re = new RegExp(param.pattern);
      if (!re.test(val)) {
        throw new Error(
          `Parameter "${param.name}" value "${val}" does not match pattern "${param.pattern}"`,
        );
      }
    }
  }

  const origin: SkillOrigin = {
    skill_id: skill.id,
    skill_slug: skill.slug,
    parameter_values: effectiveParams,
  };

  return templateSteps.map((templateStep, index) => {
    const resolved = resolveObject(templateStep, effectiveParams);

    // Generate a unique ID for each step
    const id = crypto.randomUUID();

    // Build step name from skill name (+ index for multi-step)
    const name =
      templateSteps.length > 1
        ? `${skill.name} (${index + 1}/${templateSteps.length})`
        : skill.name;

    return {
      id,
      name,
      phase,
      skill_origin: origin,
      ...resolved,
    } as UnifiedStep;
  });
}

/**
 * Instantiate a composition skill by resolving its skill_refs.
 *
 * The composition's own `allowed_phases` and `depends_on` are enforced, and its
 * parameter defaults fill any value the caller left out. Each ref then sees,
 * in rising precedence: its own parameter defaults, the caller's values and
 * the composition's defaults, and the ref's `parameter_overrides`. Each SkillRef is looked up via `getSkill` and
 * instantiated individually; a ref may itself be a composition, which is
 * expanded in turn. A ref chain that leads back to a composition already being
 * expanded is refused rather than recursed forever. A failure inside a ref is
 * rethrown prefixed with the composition that reached it.
 * Returns all resulting steps flattened.
 */
export function instantiateComposition(
  skill: SkillDefinition,
  phase: WorkflowPhase,
  paramValues: Record<string, unknown>,
): UnifiedStep[] {
  return expandComposition(skill, phase, paramValues, []);
}

function expandComposition(
  skill: SkillDefinition,
  phase: WorkflowPhase,
  paramValues: Record<string, unknown>,
  expanding: string[],
): UnifiedStep[] {
  if (skill.template.kind !== "composition") {
    throw new Error(`Skill "${skill.name}" is not a composition skill`);
  }
  if (expanding.includes(skill.id)) {
    throw new Error(
      `Skill "${skill.name}" is part of a composition cycle: ${[...expanding, skill.id].join(" -> ")}`,
    );
  }
  if (!skill.allowed_phases.includes(phase)) {
    throw new Error(
      `Skill "${skill.name}" is not allowed in phase "${phase}". ` +
        `Allowed phases: ${skill.allowed_phases.join(", ")}`,
    );
  }
  const missingDeps = validateDependencies(skill);
  if (missingDeps.length > 0) {
    throw new Error(
      `Skill "${skill.name}" has missing dependencies: ${missingDeps.join(", ")}`,
    );
  }

  const path = [...expanding, skill.id];
  const compositionParams = {
    ...paramValues,
    ...buildEffectiveParams(skill, paramValues),
  };

  const allSteps: UnifiedStep[] = [];
  for (const ref of skill.template.skill_refs) {
    const refSkill = getSkill(ref.skill_id);
    if (!refSkill) {
      throw new Error(
        `In composition "${skill.name}": referenced skill not found: ${ref.skill_id}`,
      );
    }

    const mergedParams = { ...compositionParams, ...ref.parameter_overrides };
    try {
      const steps =
        refSkill.template.kind === "composition"
          ? expandComposition(refSkill, phase, mergedParams, path)
          : instantiateSkill(refSkill, phase, mergedParams);
      allSteps.push(...steps);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // `cause` set by hand: the ES2020 lib this package targets has no
      // ErrorOptions constructor overload.
      throw Object.assign(
        new Error(`In composition "${skill.name}": ${message}`),
        { cause: err },
      );
    }
  }

  return allSteps;
}

/**
 * Whether a skill can be turned into workflow steps at all.
 *
 * `single_step` and `multi_step` templates produce steps; a `composition` does
 * when every ref resolves in the registry and itself produces steps, with no
 * cycle. A `playbook` (domain knowledge injected into prompts) and any
 * template kind this build does not know do not. A catalog that offers skills
 * for adding steps should list only skills this returns `true` for — the rest
 * always make `instantiateSkillSteps` throw. This judges template kinds only:
 * a listed skill can still be refused for its phase, its `depends_on` or its
 * parameter values, and a template with no entries (`steps: []`, no refs)
 * passes while yielding zero steps.
 */
export function skillProducesSteps(skill: SkillDefinition): boolean {
  return producesSteps(skill, []);
}

function producesSteps(skill: SkillDefinition, expanding: string[]): boolean {
  // Widened on purpose: the template may carry a kind (e.g. `playbook`) that
  // the installed shared-types union does not list.
  const kind: string = skill.template.kind;
  if (kind === "single_step" || kind === "multi_step") return true;
  if (skill.template.kind !== "composition") return false;
  if (expanding.includes(skill.id)) return false;
  const path = [...expanding, skill.id];
  return skill.template.skill_refs.every((ref) => {
    const refSkill = getSkill(ref.skill_id);
    return refSkill !== undefined && producesSteps(refSkill, path);
  });
}

/**
 * Instantiate any step-producing skill: compositions go through
 * `instantiateComposition`, everything else through `instantiateSkill`.
 * This is the entry point a catalog should call; it throws for a skill
 * `skillProducesSteps` rejects.
 */
export function instantiateSkillSteps(
  skill: SkillDefinition,
  phase: WorkflowPhase,
  paramValues: Record<string, unknown>,
): UnifiedStep[] {
  return skill.template.kind === "composition"
    ? instantiateComposition(skill, phase, paramValues)
    : instantiateSkill(skill, phase, paramValues);
}

/**
 * Validate that all required parameters are provided.
 * Returns an array of error messages (empty if valid).
 */
export function validateSkillParams(
  skill: SkillDefinition,
  paramValues: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const param of skill.parameters) {
    if (param.required) {
      const value = paramValues[param.name];
      if (value === undefined || value === null || value === "") {
        errors.push(`"${param.label}" is required`);
      }
    }
  }
  return errors;
}
