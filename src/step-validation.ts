/**
 * Step Validation
 *
 * Pure functions for validating workflow steps. Extracted from both
 * frontends to eliminate duplication.
 */

import type { UnifiedStep } from "@qontinui/shared-types/workflow";

// =============================================================================
// Types
// =============================================================================

export interface StepValidationIssue {
  field: string;
  message: string;
  severity: "warning" | "error";
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Get validation issues for a workflow step.
 * Returns an empty array if the step is fully configured.
 */
export function getStepValidationIssues(
  step: UnifiedStep,
): StepValidationIssue[] {
  const issues: StepValidationIssue[] = [];

  switch (step.type) {
    case "command": {
      if (
        !step.command &&
        !step.test_type &&
        !step.check_type &&
        !step.check_group_id &&
        !step.test_id
      ) {
        issues.push({
          field: "command",
          message: "No command specified",
          severity: "error",
        });
      }
      if (
        step.test_type === "playwright" &&
        !step.script_id &&
        !step.code &&
        !step.script_content
      ) {
        issues.push({
          field: "script",
          message: "No test script",
          severity: "warning",
        });
      }
      break;
    }
    case "ui_bridge": {
      if (step.action === "navigate" && !step.url) {
        issues.push({
          field: "url",
          message: "URL required",
          severity: "error",
        });
      }
      if (step.action === "assert" && !step.target) {
        issues.push({
          field: "target",
          message: "Target element required",
          severity: "error",
        });
      }
      if (step.action === "execute" && !step.instruction) {
        issues.push({
          field: "instruction",
          message: "Instruction required",
          severity: "error",
        });
      }
      break;
    }
    case "prompt": {
      if (!step.content) {
        issues.push({
          field: "content",
          message: "Empty prompt",
          severity: "warning",
        });
      }
      break;
    }
  }

  return issues;
}

// =============================================================================
// Needs Config
// =============================================================================

/**
 * Check if a step still needs configuration before it can run.
 */
export function needsConfig(step: UnifiedStep): boolean {
  switch (step.type) {
    case "command":
      if (step.check_group_id) return false;
      if (step.check_type) return !step.command && !step.check_id;
      if (step.test_type || step.test_id)
        return !step.command && !step.code && !step.test_id && !step.script_id;
      return !step.command;
    case "prompt":
      return !step.content;
    case "ui_bridge":
      if (step.action === "navigate") return !step.url;
      if (step.action === "execute") return !step.instruction;
      if (step.action === "assert") return !step.target;
      return false; // snapshot needs no config
    default:
      return false;
  }
}

// =============================================================================
// Subtitle
// =============================================================================

/**
 * Get a human-readable subtitle/description for a step.
 * Used in the step list to show what the step does at a glance.
 */
export function getStepSubtitle(step: UnifiedStep, maxLen = 60): string {
  switch (step.type) {
    case "command": {
      if (step.check_group_id) return `Group: ${step.check_group_id}`;
      if (step.check_type)
        return step.command || step.tool || step.check_type || "Configure check...";
      if (step.test_type || step.test_id) {
        if (step.command) return step.command;
        if (step.test_type === "playwright") return "Browser test";
        if (step.test_type === "qontinui_vision") return "Vision test";
        if (step.test_type === "python") return "Python test";
        if (step.test_type === "repository") return "Repository test";
        return "Custom test";
      }
      if (step.command) {
        return step.command.length > maxLen
          ? step.command.substring(0, maxLen) + "..."
          : step.command;
      }
      return "Enter command...";
    }
    case "prompt": {
      if (step.content) {
        return step.content.length > maxLen
          ? step.content.substring(0, maxLen) + "..."
          : step.content;
      }
      return "Enter prompt...";
    }
    case "ui_bridge": {
      if (step.action === "navigate") return step.url || "Enter URL...";
      if (step.action === "execute") return step.instruction || "Enter instruction...";
      if (step.action === "assert") return step.target || "Configure assertion...";
      if (step.action === "snapshot") return "Take snapshot";
      return step.action ?? "";
    }
    case "workflow": {
      return (step as { workflow_name?: string }).workflow_name || "Select workflow...";
    }
    default:
      return "";
  }
}
