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
  if (!skill.allowed_phases.includes(phase)) {
    throw new Error(
      `Skill "${skill.name}" is not allowed in phase "${phase}". ` +
        `Allowed phases: ${skill.allowed_phases.join(", ")}`,
    );
  }

  const effectiveParams = buildEffectiveParams(skill, paramValues);

  const origin: SkillOrigin = {
    skill_id: skill.id,
    skill_slug: skill.slug,
    parameter_values: effectiveParams,
  };

  const templateSteps =
    skill.template.kind === "single_step"
      ? [skill.template.step]
      : skill.template.steps;

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
