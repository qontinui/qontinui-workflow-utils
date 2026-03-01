/**
 * Step Icon Configuration (Data Only)
 *
 * Pure data mapping from step types to icon identifiers and Tailwind color
 * classes. This module does NOT import lucide-react — apps resolve the
 * icon identifier string to an actual React component.
 *
 * This allows both frontends to share the same color palette and icon
 * mapping without depending on a specific icon library at build time.
 */

// =============================================================================
// Types
// =============================================================================

export interface StepIconData {
  /** Icon identifier — apps map this to an actual icon component */
  iconId: string;
  bgClass: string;
  textClass: string;
}

// =============================================================================
// Icon Configuration
// =============================================================================

export const STEP_ICON_DATA: Record<string, StepIconData> = {
  command: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400",
  },
  shell_command: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400",
  },
  shell: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400",
  },
  check: {
    iconId: "alert-triangle",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
  },
  check_group: {
    iconId: "check-circle",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
  },
  prompt: {
    iconId: "message-square",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
  },
  test: {
    iconId: "test-tube-2",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
  ui_bridge: {
    iconId: "monitor",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
  },
  workflow: {
    iconId: "workflow",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
  },
};

const DEFAULT_ICON_DATA: StepIconData = {
  iconId: "activity",
  bgClass: "bg-zinc-500/10",
  textClass: "text-zinc-400",
};

/** Test sub-type icon overrides */
export const TEST_ICON_DATA: Record<string, StepIconData> = {
  playwright: {
    iconId: "test-tube-2",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
  qontinui_vision: {
    iconId: "eye",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
  python: {
    iconId: "code",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
  repository: {
    iconId: "package",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
  custom_command: {
    iconId: "terminal",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
  },
};

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Get icon data for a step type string.
 */
export function getStepIconData(stepType: string): StepIconData {
  return STEP_ICON_DATA[stepType] ?? DEFAULT_ICON_DATA;
}

/**
 * Get icon data with fallback: try iconType first, then stepType.
 */
export function getStepIconDataWithFallback(
  iconType: string | undefined,
  stepType: string,
): StepIconData {
  if (iconType && STEP_ICON_DATA[iconType]) {
    return STEP_ICON_DATA[iconType];
  }
  return STEP_ICON_DATA[stepType] ?? DEFAULT_ICON_DATA;
}

/**
 * Get icon data for a test sub-type.
 */
export function getTestIconData(testType: string): StepIconData {
  return TEST_ICON_DATA[testType] ?? DEFAULT_ICON_DATA;
}
