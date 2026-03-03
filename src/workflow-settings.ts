/**
 * Declarative Workflow Settings Configuration
 *
 * Central source of truth for all workflow settings fields, provider/model
 * options, and log source helpers. Both frontends (web + runner) consume
 * these definitions to render their settings panels — eliminating duplication
 * of field lists, labels, defaults, tooltips, and visibility rules.
 */

import type { WorkflowFeatures } from "@qontinui/shared-types/workflow";

// =============================================================================
// Setting Definition Types
// =============================================================================

export interface BooleanSettingDef {
  key: string;
  type: "boolean";
  label: string;
  defaultValue: boolean;
  /** When true, the stored value is the inverse of what's displayed.
   *  e.g. skip_ai_summary=true => "Generate AI summary" shown as unchecked */
  invertDisplay?: boolean;
  tooltip?: string;
  /** Return false to hide this setting based on detected workflow features */
  visible?: (features: WorkflowFeatures) => boolean;
}

export interface NumberSettingDef {
  key: string;
  type: "number";
  label: string;
  defaultValue?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  description?: string;
  visible?: (features: WorkflowFeatures) => boolean;
}

export interface SelectSettingDef {
  key: string;
  type: "select";
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  description?: string;
  visible?: (features: WorkflowFeatures) => boolean;
}

/** Custom settings rendered by the app (health check URLs, prompt template, etc.) */
export interface CustomSettingDef {
  key: string;
  type: "custom";
  label: string;
  /** Identifier the app uses to decide which custom renderer to show */
  customType: string;
  visible?: (features: WorkflowFeatures) => boolean;
}

export type SettingDef =
  | BooleanSettingDef
  | NumberSettingDef
  | SelectSettingDef
  | CustomSettingDef;

export interface SettingsSection {
  id: string;
  label: string;
  settings: SettingDef[];
}

// =============================================================================
// Provider / Model Options
// =============================================================================

export interface ProviderOption {
  value: string;
  label: string;
}

export interface ModelOption {
  value: string;
  label: string;
}

/** Provider options for workflow-level AI override */
export const PROVIDER_OPTIONS: readonly ProviderOption[] = [
  { value: "", label: "Use Default (from Settings)" },
  { value: "claude_cli", label: "Claude CLI" },
  { value: "anthropic_api", label: "Anthropic API" },
  { value: "openai_api", label: "OpenAI API" },
  { value: "gemini_api", label: "Gemini API" },
] as const;

/** Sentinel value for smart auto-routing (router decides model by complexity). */
export const SMART_ROUTING_SENTINEL = "__smart__";

/** Model options per provider */
export const MODELS_BY_PROVIDER: Record<string, readonly ModelOption[]> = {
  claude_cli: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  ],
  anthropic_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  ],
  openai_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1-mini" },
  ],
  gemini_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
};

/** Provider options for the AI generate panel (different set — no "Use Default") */
export const GENERATE_PROVIDER_OPTIONS: readonly ProviderOption[] = [
  { value: "claude_cli", label: "Claude CLI" },
  { value: "claude_api", label: "Claude API" },
  { value: "gemini_cli", label: "Gemini CLI" },
  { value: "gemini_api", label: "Gemini API" },
] as const;

/** Model options for Claude in the generate panel (shorter model IDs) */
export const GENERATE_CLAUDE_MODELS: readonly ModelOption[] = [
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
] as const;

/** Model options for Gemini in the generate panel */
export const GENERATE_GEMINI_MODELS: readonly ModelOption[] = [
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

/** Get models for a generate-panel provider */
export function getGenerateModels(
  provider: string,
): readonly ModelOption[] {
  if (provider.startsWith("claude")) return GENERATE_CLAUDE_MODELS;
  if (provider.startsWith("gemini")) return GENERATE_GEMINI_MODELS;
  return [];
}

// =============================================================================
// Log Source Helpers
// =============================================================================

export type LogSourceSelection =
  | "default"
  | "ai"
  | "all"
  | { profile_id: string };

/**
 * Convert a LogSourceSelection to a string value for use in a dropdown.
 */
export function getLogSourceValue(
  selection: LogSourceSelection | undefined | null,
): string {
  if (!selection) return "default";
  if (typeof selection === "string") return selection;
  if (typeof selection === "object" && "profile_id" in selection) {
    return `profile:${selection.profile_id}`;
  }
  return "default";
}

/**
 * Parse a dropdown string value back into a LogSourceSelection.
 */
export function parseLogSourceValue(
  value: string,
): LogSourceSelection | undefined {
  if (value === "default") return undefined;
  if (value === "ai" || value === "all") return value;
  if (value.startsWith("profile:")) {
    return { profile_id: value.slice("profile:".length) };
  }
  return undefined;
}

// =============================================================================
// Named Setting Definitions
// =============================================================================

export const REFLECTION_MODE_SETTING: BooleanSettingDef = {
  key: "reflection_mode",
  type: "boolean",
  label: "Reflection mode",
  defaultValue: true,
  tooltip:
    "Investigates root causes before fixing failures. The AI will research " +
    "related code, use subagents for exploration, and document findings before " +
    "implementing changes. Uses significantly more tokens and takes longer. " +
    "Enable for complex or recurring failures where quick fixes keep missing " +
    "the real issue.",
};

export const STOP_ON_FAILURE_SETTING: BooleanSettingDef = {
  key: "stop_on_failure",
  type: "boolean",
  label: "Stop on failure",
  defaultValue: false,
  tooltip: "Stop the workflow immediately when a step fails instead of continuing.",
};

export const APPROVAL_GATE_SETTING: BooleanSettingDef = {
  key: "approval_gate",
  type: "boolean",
  label: "Approval Gate",
  defaultValue: false,
  tooltip: "Pause for human review after each agentic phase before continuing to verification",
  visible: (f) => f.hasAiPrompts,
};

export const LOG_WATCH_SETTING: BooleanSettingDef = {
  key: "log_watch_enabled",
  type: "boolean",
  label: "Enable log watching",
  defaultValue: true,
  tooltip: "Scan backend and frontend logs for errors before each verification.",
};

export const HEALTH_CHECK_SETTING: BooleanSettingDef = {
  key: "health_check_enabled",
  type: "boolean",
  label: "Enable health checks",
  defaultValue: true,
  tooltip: "Verify configured servers are running before verification.",
};

export const AI_SUMMARY_SETTING: BooleanSettingDef = {
  key: "skip_ai_summary",
  type: "boolean",
  label: "Generate AI summary",
  defaultValue: false,
  invertDisplay: true,
  tooltip: "Generate an AI summary of the workflow execution.",
  visible: (f) => f.hasAiPrompts,
};

export const MAX_ITERATIONS_SETTING: NumberSettingDef = {
  key: "max_iterations",
  type: "number",
  label: "Max Iterations",
  defaultValue: 10,
  min: 1,
  max: 100,
  description: "Maximum number of verification ↔ agentic loops",
  visible: (f) => f.showIterationSettings,
};

export const TIMEOUT_SETTING: NumberSettingDef = {
  key: "timeout_seconds",
  type: "number",
  label: "AI Timeout (seconds)",
  placeholder: "No timeout",
  min: 60,
  max: 7200,
  description: "Kill AI session after N seconds of inactivity",
  visible: (f) => f.showIterationSettings,
};

export const PROVIDER_SETTING: SelectSettingDef = {
  key: "provider",
  type: "select",
  label: "AI Provider",
  defaultValue: "",
  options: PROVIDER_OPTIONS,
  visible: (f) => f.hasAiPrompts,
};

export const MODEL_SETTING: CustomSettingDef = {
  key: "model",
  type: "custom",
  label: "AI Model",
  customType: "model_select",
  visible: (f) => f.hasAiPrompts,
};

export const LOG_SOURCE_SETTING: CustomSettingDef = {
  key: "log_source_selection",
  type: "custom",
  label: "Log Sources",
  customType: "log_source_select",
  visible: (f) => f.showIterationSettings,
};

export const HEALTH_CHECK_URLS_SETTING: CustomSettingDef = {
  key: "health_check_urls",
  type: "custom",
  label: "Health Check URLs",
  customType: "health_check_urls",
};

export const PROMPT_TEMPLATE_SETTING: CustomSettingDef = {
  key: "prompt_template",
  type: "custom",
  label: "Developer Prompt Template",
  customType: "prompt_template",
  visible: (f) => f.showIterationSettings,
};

export const CONTEXT_MANAGEMENT_SETTING: CustomSettingDef = {
  key: "contexts",
  type: "custom",
  label: "AI Contexts",
  customType: "context_management",
  visible: (f) => f.hasAiPrompts,
};

export const PER_PHASE_MODEL_SETTING: CustomSettingDef = {
  key: "model_overrides",
  type: "custom",
  label: "Per-Phase Model Selection",
  customType: "per_phase_model_select",
  visible: (f) => f.hasAiPrompts,
};

/** Custom setting definition for the resolved model preview table. */
export const RESOLVED_MODEL_PREVIEW_SETTING: CustomSettingDef = {
  key: "resolved_model_preview",
  type: "custom",
  label: "Effective Model Preview",
  customType: "resolved_model_preview",
  visible: (f) => f.hasAiPrompts,
};

/** Phase metadata for the per-phase model select UI */
export const MODEL_OVERRIDE_PHASES = [
  { key: "setup", label: "Setup Phase" },
  { key: "agentic", label: "Agentic Phase" },
  { key: "completion", label: "Completion Phase" },
  { key: "verification", label: "Verification (generation review)" },
  { key: "investigation", label: "Investigation (pre-generation)" },
  { key: "summary", label: "Summary Generation" },
  { key: "generation", label: "Workflow Generation" },
] as const;

// =============================================================================
// Settings Configuration — Workflow Editor
// =============================================================================

/**
 * Complete settings layout for the workflow editor panel.
 * Sections are rendered in order. Each section's settings are
 * rendered in order, with visibility filtered by workflow features.
 */
export const WORKFLOW_SETTINGS_CONFIG: readonly SettingsSection[] = [
  {
    id: "identity",
    label: "Identity",
    settings: [
      { key: "name", type: "custom", label: "Name", customType: "name_input" },
      {
        key: "description",
        type: "custom",
        label: "Description",
        customType: "description_input",
      },
    ],
  },
  {
    id: "iteration",
    label: "Iteration",
    settings: [MAX_ITERATIONS_SETTING, TIMEOUT_SETTING],
  },
  {
    id: "ai",
    label: "AI Configuration",
    settings: [
      REFLECTION_MODE_SETTING,
      PROVIDER_SETTING,
      MODEL_SETTING,
      PER_PHASE_MODEL_SETTING,
      RESOLVED_MODEL_PREVIEW_SETTING,
      AI_SUMMARY_SETTING,
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    settings: [
      HEALTH_CHECK_SETTING,
      HEALTH_CHECK_URLS_SETTING,
      LOG_WATCH_SETTING,
      LOG_SOURCE_SETTING,
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    settings: [
      PROMPT_TEMPLATE_SETTING,
      CONTEXT_MANAGEMENT_SETTING,
      STOP_ON_FAILURE_SETTING,
      APPROVAL_GATE_SETTING,
    ],
  },
  {
    id: "metadata",
    label: "Metadata",
    settings: [
      {
        key: "category",
        type: "custom",
        label: "Category",
        customType: "category_input",
      },
      {
        key: "tags",
        type: "custom",
        label: "Tags",
        customType: "tags_input",
      },
    ],
  },
] as const;

// =============================================================================
// Settings Configuration — AI Generate Panel
// =============================================================================

/** Advanced-options settings for the AI generation panel */
export const GENERATE_SETTINGS_CONFIG: readonly SettingDef[] = [
  {
    key: "reflectionMode",
    type: "boolean",
    label: "Reflection mode",
    defaultValue: true,
    tooltip: REFLECTION_MODE_SETTING.tooltip,
  },
  {
    key: "includeUIBridge",
    type: "boolean",
    label: "Include UI Bridge SDK",
    defaultValue: true,
    tooltip: "Include UI Bridge SDK instructions in generated workflows.",
  },
  {
    key: "autoIncludeContexts",
    type: "boolean",
    label: "Auto-include contexts",
    defaultValue: true,
    tooltip: "Automatically match and include relevant knowledge base documents.",
  },
  {
    key: "investigateCodebase",
    type: "boolean",
    label: "Investigate codebase",
    defaultValue: true,
    tooltip:
      "Run an AI investigation step before generating the workflow. " +
      "Analyzes project structure to produce a more targeted workflow. " +
      "Adds ~30s to generation time.",
  },
  {
    key: "includeDesignGuidance",
    type: "boolean",
    label: "Include design guidance",
    defaultValue: false,
    tooltip:
      "Include frontend design quality guidance (typography, color, motion, " +
      "spatial composition, anti-AI-slop rules) in generated workflows. " +
      "Enable for design-focused frontend tasks.",
  },
] as const;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Filter a flat list of settings to only those visible given the current
 * workflow features.
 */
export function getVisibleSettings(
  settings: readonly SettingDef[],
  features: WorkflowFeatures,
): SettingDef[] {
  return settings.filter((def) => !def.visible || def.visible(features));
}

/**
 * Filter sections, removing settings that aren't visible and dropping
 * sections that end up empty.
 */
export function getVisibleSections(
  sections: readonly SettingsSection[],
  features: WorkflowFeatures,
): SettingsSection[] {
  return sections
    .map((section) => ({
      ...section,
      settings: getVisibleSettings(section.settings, features),
    }))
    .filter((section) => section.settings.length > 0);
}

/**
 * Resolve the display value for a boolean setting, accounting for invertDisplay.
 */
export function getBooleanDisplayValue(
  def: BooleanSettingDef,
  storedValue: unknown,
): boolean {
  const raw =
    storedValue === undefined || storedValue === null
      ? def.defaultValue
      : Boolean(storedValue);
  return def.invertDisplay ? !raw : raw;
}

/**
 * Convert a display (checkbox) value back to the stored value,
 * accounting for invertDisplay.
 */
export function toBooleanStoredValue(
  def: BooleanSettingDef,
  displayValue: boolean,
): boolean {
  return def.invertDisplay ? !displayValue : displayValue;
}

// =============================================================================
// Model Presets
// =============================================================================

import type { ModelOverrides } from "@qontinui/shared-types";

export interface ModelPreset {
  id: string;
  name: string;
  description: string;
  overrides: ModelOverrides;
}

export const MODEL_PRESETS: readonly ModelPreset[] = [
  {
    id: "quality_first",
    name: "Quality First",
    description: "Opus for agentic, Sonnet elsewhere",
    overrides: {
      agentic: { model: "claude-opus-4-20250514" },
      setup: { model: "claude-sonnet-4-20250514" },
      completion: { model: "claude-sonnet-4-20250514" },
    },
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Sonnet everywhere",
    overrides: {
      setup: { model: "claude-sonnet-4-20250514" },
      agentic: { model: "claude-sonnet-4-20250514" },
      completion: { model: "claude-sonnet-4-20250514" },
    },
  },
  {
    id: "smart",
    name: "Smart Routing",
    description: "Auto-route by task complexity",
    overrides: {
      setup: { model: SMART_ROUTING_SENTINEL },
      agentic: { model: SMART_ROUTING_SENTINEL },
      completion: { model: SMART_ROUTING_SENTINEL },
    },
  },
] as const;

/** Detect which preset matches the current overrides, or "custom". */
export function detectPreset(
  overrides: ModelOverrides | undefined,
): string {
  if (!overrides) return "custom";

  for (const preset of MODEL_PRESETS) {
    const presetKeys = Object.keys(preset.overrides) as (keyof ModelOverrides)[];
    const overrideKeys = Object.keys(overrides).filter(
      (k) => overrides[k as keyof ModelOverrides]?.model,
    );

    if (presetKeys.length !== overrideKeys.length) continue;

    const allMatch = presetKeys.every((key) => {
      const p = preset.overrides[key];
      const o = overrides[key];
      return p?.model === o?.model && (p?.provider ?? "") === (o?.provider ?? "");
    });

    if (allMatch) return preset.id;
  }

  return "custom";
}

// =============================================================================
// Resolved Model Preview
// =============================================================================

export interface ResolvedModelInfo {
  provider: string;
  model: string;
  source: "phase" | "workflow" | "global" | "smart";
}

/** Resolve the effective model for a given phase through the fallback chain. */
export function resolveModelForPhase(
  phase: string,
  overrides: ModelOverrides | undefined,
  workflowModel: string | undefined,
  globalModel: string | undefined,
): ResolvedModelInfo {
  const phaseConfig = overrides?.[phase as keyof ModelOverrides];

  if (phaseConfig?.model) {
    if (phaseConfig.model === SMART_ROUTING_SENTINEL) {
      return { provider: phaseConfig.provider ?? "", model: "Smart (auto)", source: "smart" };
    }
    return { provider: phaseConfig.provider ?? "", model: phaseConfig.model, source: "phase" };
  }

  if (workflowModel) {
    if (workflowModel === SMART_ROUTING_SENTINEL) {
      return { provider: "", model: "Smart (auto)", source: "smart" };
    }
    return { provider: "", model: workflowModel, source: "workflow" };
  }

  if (globalModel) {
    return { provider: "", model: globalModel, source: "global" };
  }

  return { provider: "", model: "Global Default", source: "global" };
}
