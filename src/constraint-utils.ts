/**
 * Constraint Engine Utilities
 *
 * Pure helper functions for working with constraint types.
 * Used by both the web and runner frontends.
 */

import type {
  ConstraintSeverity,
  ConstraintCheckType,
} from "@qontinui/shared-types/constraints";

// ============================================================================
// Built-in Constraint IDs
// ============================================================================

/** All built-in constraint IDs shipped with the runner. */
export const BUILTIN_CONSTRAINT_IDS = [
  "builtin:no-secrets",
  "builtin:no-debug-statements",
  "builtin:no-env-files",
] as const;

export type BuiltinConstraintId = (typeof BUILTIN_CONSTRAINT_IDS)[number];

// ============================================================================
// ID Classification Helpers
// ============================================================================

/** Returns true if the constraint was shipped as a built-in. */
export function isBuiltinConstraint(id: string): boolean {
  return id.startsWith("builtin:");
}

/** Returns true if the constraint was defined in `constraints.toml` by the user. */
export function isCustomConstraint(id: string): boolean {
  return id.startsWith("project:");
}

/** Returns true if the constraint was proposed by the AI during an agentic phase. */
export function isAiConstraint(id: string): boolean {
  return id.startsWith("ai:");
}

// ============================================================================
// Display Helpers
// ============================================================================

/** Human-readable label for a constraint check type. */
export function constraintCheckTypeLabel(type: ConstraintCheckType): string {
  switch (type) {
    case "grep_forbidden":
      return "Grep Forbidden";
    case "grep_required":
      return "Grep Required";
    case "file_scope":
      return "File Scope";
    case "command":
      return "Command";
    default:
      return type;
  }
}

/** Human-readable label for a severity level. */
export function severityLabel(severity: ConstraintSeverity): string {
  switch (severity) {
    case "block":
      return "Block";
    case "warn":
      return "Warn";
    case "log":
      return "Log";
    default:
      return severity;
  }
}

/** Tailwind color class for a severity level (text color). */
export function severityColor(severity: ConstraintSeverity): string {
  switch (severity) {
    case "block":
      return "text-red-500";
    case "warn":
      return "text-yellow-500";
    case "log":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

/** Tailwind background color class for a severity badge. */
export function severityBadgeColor(severity: ConstraintSeverity): string {
  switch (severity) {
    case "block":
      return "bg-red-500/10 text-red-500";
    case "warn":
      return "bg-yellow-500/10 text-yellow-500";
    case "log":
      return "bg-gray-500/10 text-gray-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a `project:` constraint ID from a human-readable name.
 *
 * Converts to lowercase, replaces whitespace with hyphens, and strips
 * characters that aren't alphanumeric or hyphens.
 */
export function generateConstraintId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `project:${slug}`;
}

// ============================================================================
// Default Timeout
// ============================================================================

/** Default timeout in seconds for command checks (matches Rust default). */
export const DEFAULT_COMMAND_TIMEOUT_SECS = 30;

/** Default warning threshold fraction (matches Rust default). */
export const DEFAULT_WARNING_THRESHOLD = 0.75;
