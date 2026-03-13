/**
 * Constraint TOML Generation
 *
 * Pure functions for serializing in-memory constraint state to TOML format
 * compatible with the Rust `parse_config_str` parser.
 *
 * Used by both the runner and web frontend useConstraints hooks.
 */

import type {
  Constraint,
  ConstraintCheck,
  ResourceLimits,
} from "@qontinui/shared-types/constraints";
import { isBuiltinConstraint, isCustomConstraint } from "./constraint-utils";
import { DEFAULT_COMMAND_TIMEOUT_SECS } from "./constraint-utils";

// ============================================================================
// TOML String Helpers
// ============================================================================

/** Escape a TOML string value (wrap in quotes, escape backslashes and quotes). */
export function tomlString(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/** Format a TOML array of strings on a single line. */
export function tomlStringArray(values: string[]): string {
  return `[${values.map(tomlString).join(", ")}]`;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate a clean, readable TOML config string from the in-memory constraint model.
 *
 * The output matches the format expected by the Rust `parse_config_str` function:
 * - `[builtins]` section with `no-secrets = true/false`, etc.
 * - `[resources]` section (only if any limit is set)
 * - `[[constraint]]` array entries with check-type-specific fields
 *
 * AI constraints (id starting with "ai:") are excluded from the output.
 * Only builtin and project constraints are serialized.
 */
export function generateConstraintToml(
  constraints: Constraint[],
  resourceLimits: ResourceLimits,
): string {
  const lines: string[] = [];

  // -- [builtins] section --
  const builtins = constraints.filter((c) => isBuiltinConstraint(c.id));
  if (builtins.length > 0) {
    lines.push("[builtins]");
    for (const b of builtins) {
      // Extract the suffix from "builtin:no-secrets" → "no-secrets"
      const suffix = b.id.replace(/^builtin:/, "");
      lines.push(`${suffix} = ${b.enabled}`);
    }
    lines.push("");
  }

  // -- [resources] section --
  const hasResources =
    resourceLimits.max_wall_time_secs != null ||
    resourceLimits.max_files_modified != null ||
    resourceLimits.max_agentic_time_ms != null ||
    resourceLimits.warning_threshold != null;

  if (hasResources) {
    lines.push("[resources]");
    if (resourceLimits.max_wall_time_secs != null) {
      lines.push(`max_wall_time_secs = ${resourceLimits.max_wall_time_secs}`);
    }
    if (resourceLimits.max_files_modified != null) {
      lines.push(`max_files_modified = ${resourceLimits.max_files_modified}`);
    }
    if (resourceLimits.max_agentic_time_ms != null) {
      lines.push(`max_agentic_time_ms = ${resourceLimits.max_agentic_time_ms}`);
    }
    if (resourceLimits.warning_threshold != null) {
      lines.push(`warning_threshold = ${resourceLimits.warning_threshold}`);
    }
    lines.push("");
  }

  // -- [[constraint]] entries --
  const custom = constraints.filter((c) => isCustomConstraint(c.id));
  for (const c of custom) {
    lines.push("[[constraint]]");
    lines.push(`id = ${tomlString(c.id)}`);
    lines.push(`name = ${tomlString(c.name)}`);
    if (c.description) {
      lines.push(`description = ${tomlString(c.description)}`);
    }
    lines.push(`severity = ${tomlString(c.severity)}`);
    if (!c.enabled) {
      lines.push("enabled = false");
    }
    lines.push("");

    // Check sub-table
    lines.push("[constraint.check]");
    appendCheckToml(lines, c.check);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

// ============================================================================
// Check-Type Serialization
// ============================================================================

/** Append check-type-specific TOML fields to the lines array. */
function appendCheckToml(lines: string[], check: ConstraintCheck): void {
  switch (check.type) {
    case "grep_forbidden":
      lines.push(`type = "grep_forbidden"`);
      lines.push(`pattern = ${tomlString(check.pattern)}`);
      if (check.file_glob) {
        lines.push(`file_glob = ${tomlString(check.file_glob)}`);
      }
      break;

    case "grep_required":
      lines.push(`type = "grep_required"`);
      lines.push(`pattern = ${tomlString(check.pattern)}`);
      if (check.file_glob) {
        lines.push(`file_glob = ${tomlString(check.file_glob)}`);
      }
      break;

    case "file_scope":
      lines.push(`type = "file_scope"`);
      lines.push(`allowed_paths = ${tomlStringArray(check.allowed_paths)}`);
      break;

    case "command":
      lines.push(`type = "command"`);
      lines.push(`cmd = ${tomlString(check.cmd)}`);
      if (check.cwd) {
        lines.push(`cwd = ${tomlString(check.cwd)}`);
      }
      if (check.timeout_secs !== DEFAULT_COMMAND_TIMEOUT_SECS) {
        lines.push(`timeout_secs = ${check.timeout_secs}`);
      }
      break;
  }
}
