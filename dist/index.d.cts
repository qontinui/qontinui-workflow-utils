import { UnifiedStep, WorkflowPhase, UnifiedWorkflow, PromptStep, WorkflowFeatures, WorkflowStage, SkillDefinition, SkillCategory } from '@qontinui/shared-types/workflow';
import { AccentColorClasses, ActionColorClasses, SeverityColorClasses, StatusColorClasses } from '@qontinui/shared-types/library';
import { ScheduleConditions, ScheduleExpression, ScheduledTaskType, ConditionStatus, ScheduledTaskStatus, ScheduledTask } from '@qontinui/shared-types/scheduler';
import { TaskRun } from '@qontinui/shared-types/task-run';
import { CompressionStatus, ExecutionStatus, HookStatus, RetryStatus, RoutingStatus, SubStepStatusDisplay } from '@qontinui/shared-types/execution';
import { ModelOverrides, ChatMessage } from '@qontinui/shared-types';

declare function generateStepId(): string;
declare function createSummaryStep(): PromptStep;
declare function createDefaultStep(type: UnifiedStep["type"], phase: WorkflowPhase): UnifiedStep;
declare function createDefaultWorkflow(includeSummaryStep?: boolean): Omit<UnifiedWorkflow, "id" | "created_at" | "modified_at">;

declare function detectWorkflowFeatures(workflow: UnifiedWorkflow): WorkflowFeatures;
declare function isWorkflowEmpty(workflow: UnifiedWorkflow): boolean;
declare function getTotalStepCount(workflow: UnifiedWorkflow): number;
declare function getStepPhase(step: UnifiedStep): WorkflowPhase;
declare function canStepExistInPhase(stepType: UnifiedStep["type"], phase: WorkflowPhase): boolean;
declare function normalizeToPhases(workflow: UnifiedWorkflow): WorkflowStage[];
declare function getPhaseCount(workflow: UnifiedWorkflow): number;

declare function formatDuration(ms: number): string;
declare function formatRelativeTime(date: Date | string): string;
declare function formatTokenCount(tokens: number): string;

declare function getSeverityColors(severity: string): SeverityColorClasses;
declare function getStatusColors(status: string): StatusColorClasses;
declare function getActionColors(actionType: string): ActionColorClasses;
declare function getAccentColors(color: string): AccentColorClasses;

declare function describeSchedule(schedule: ScheduleExpression): string;
declare function describeCron(cron: string): string;
declare function describeInterval(seconds: number): string;
declare function describeTaskType(task: ScheduledTaskType): string;
declare function getSchedulerStatusColor(status: ScheduledTaskStatus): string;
declare function isScheduledTaskRunning(task: ScheduledTask): boolean;
declare function hasCompletedSuccessfully(task: ScheduledTask): boolean;
declare function getTimeUntilNextRun(task: ScheduledTask): string | null;
declare function isWaitingForConditions(task: ScheduledTask): boolean;
declare function hasConditions(task: ScheduledTask): boolean;
declare function describeConditions(conditions: ScheduleConditions): string;
declare function getConditionStatusText(status: ConditionStatus): string;

declare function isTaskRunning(task: TaskRun): boolean;
declare function isTaskComplete(task: TaskRun): boolean;
declare function isTaskFailed(task: TaskRun): boolean;
declare function isTaskFinished(task: TaskRun): boolean;

declare function createDefaultRoutingStatus(): RoutingStatus;
declare function createDefaultRetryStatus(): RetryStatus;
declare function createDefaultCompressionStatus(): CompressionStatus;
declare function createDefaultHookStatus(): HookStatus;
declare function createDefaultSubStepStatus(): SubStepStatusDisplay;
declare function createDefaultExecutionStatus(): ExecutionStatus;
declare function getComplexityDisplayName(complexity: "simple" | "medium" | "complex"): string;
declare function getHookTriggerDisplayName(trigger: string): string;
declare function calculateCompressionSavings(result: {
    originalTokens: number;
    compressedTokens: number;
}): number;

/**
 * Declarative Workflow Settings Configuration
 *
 * Central source of truth for all workflow settings fields, provider/model
 * options, and log source helpers. Both frontends (web + runner) consume
 * these definitions to render their settings panels — eliminating duplication
 * of field lists, labels, defaults, tooltips, and visibility rules.
 */

interface BooleanSettingDef {
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
interface NumberSettingDef {
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
interface SelectSettingDef {
    key: string;
    type: "select";
    label: string;
    defaultValue: string;
    options: ReadonlyArray<{
        value: string;
        label: string;
    }>;
    description?: string;
    visible?: (features: WorkflowFeatures) => boolean;
}
/** Custom settings rendered by the app (health check URLs, prompt template, etc.) */
interface CustomSettingDef {
    key: string;
    type: "custom";
    label: string;
    /** Identifier the app uses to decide which custom renderer to show */
    customType: string;
    visible?: (features: WorkflowFeatures) => boolean;
}
type SettingDef = BooleanSettingDef | NumberSettingDef | SelectSettingDef | CustomSettingDef;
interface SettingsSection {
    id: string;
    label: string;
    settings: SettingDef[];
}
interface ProviderOption {
    value: string;
    label: string;
}
interface ModelOption {
    value: string;
    label: string;
}
/** Provider options for workflow-level AI override */
declare const PROVIDER_OPTIONS: readonly ProviderOption[];
/** Sentinel value for smart auto-routing (router decides model by complexity). */
declare const SMART_ROUTING_SENTINEL = "__smart__";
/** Model options per provider */
declare const MODELS_BY_PROVIDER: Record<string, readonly ModelOption[]>;
/** Provider options for the AI generate panel (different set — no "Use Default") */
declare const GENERATE_PROVIDER_OPTIONS: readonly ProviderOption[];
/** Model options for Claude in the generate panel (shorter model IDs) */
declare const GENERATE_CLAUDE_MODELS: readonly ModelOption[];
/** Model options for Gemini in the generate panel */
declare const GENERATE_GEMINI_MODELS: readonly ModelOption[];
/** Get models for a generate-panel provider */
declare function getGenerateModels(provider: string): readonly ModelOption[];
type LogSourceSelection = "default" | "ai" | "all" | {
    profile_id: string;
};
/**
 * Convert a LogSourceSelection to a string value for use in a dropdown.
 */
declare function getLogSourceValue(selection: LogSourceSelection | undefined | null): string;
/**
 * Parse a dropdown string value back into a LogSourceSelection.
 */
declare function parseLogSourceValue(value: string): LogSourceSelection | undefined;
declare const REFLECTION_MODE_SETTING: BooleanSettingDef;
declare const STOP_ON_FAILURE_SETTING: BooleanSettingDef;
declare const APPROVAL_GATE_SETTING: BooleanSettingDef;
declare const LOG_WATCH_SETTING: BooleanSettingDef;
declare const HEALTH_CHECK_SETTING: BooleanSettingDef;
declare const AI_SUMMARY_SETTING: BooleanSettingDef;
declare const MAX_ITERATIONS_SETTING: NumberSettingDef;
declare const TIMEOUT_SETTING: NumberSettingDef;
declare const PROVIDER_SETTING: SelectSettingDef;
declare const MODEL_SETTING: CustomSettingDef;
declare const LOG_SOURCE_SETTING: CustomSettingDef;
declare const HEALTH_CHECK_URLS_SETTING: CustomSettingDef;
declare const PROMPT_TEMPLATE_SETTING: CustomSettingDef;
declare const CONTEXT_MANAGEMENT_SETTING: CustomSettingDef;
declare const PER_PHASE_MODEL_SETTING: CustomSettingDef;
/** Custom setting definition for the resolved model preview table. */
declare const RESOLVED_MODEL_PREVIEW_SETTING: CustomSettingDef;
/** Phase metadata for the per-phase model select UI */
declare const MODEL_OVERRIDE_PHASES: readonly [{
    readonly key: "setup";
    readonly label: "Setup Phase";
}, {
    readonly key: "agentic";
    readonly label: "Agentic Phase";
}, {
    readonly key: "completion";
    readonly label: "Completion Phase";
}, {
    readonly key: "verification";
    readonly label: "Verification (generation review)";
}, {
    readonly key: "investigation";
    readonly label: "Investigation (pre-generation)";
}, {
    readonly key: "summary";
    readonly label: "Summary Generation";
}, {
    readonly key: "generation";
    readonly label: "Workflow Generation";
}];
/**
 * Complete settings layout for the workflow editor panel.
 * Sections are rendered in order. Each section's settings are
 * rendered in order, with visibility filtered by workflow features.
 */
declare const WORKFLOW_SETTINGS_CONFIG: readonly SettingsSection[];
/** Advanced-options settings for the AI generation panel */
declare const GENERATE_SETTINGS_CONFIG: readonly SettingDef[];
/**
 * Filter a flat list of settings to only those visible given the current
 * workflow features.
 */
declare function getVisibleSettings(settings: readonly SettingDef[], features: WorkflowFeatures): SettingDef[];
/**
 * Filter sections, removing settings that aren't visible and dropping
 * sections that end up empty.
 */
declare function getVisibleSections(sections: readonly SettingsSection[], features: WorkflowFeatures): SettingsSection[];
/**
 * Resolve the display value for a boolean setting, accounting for invertDisplay.
 */
declare function getBooleanDisplayValue(def: BooleanSettingDef, storedValue: unknown): boolean;
/**
 * Convert a display (checkbox) value back to the stored value,
 * accounting for invertDisplay.
 */
declare function toBooleanStoredValue(def: BooleanSettingDef, displayValue: boolean): boolean;

interface ModelPreset {
    id: string;
    name: string;
    description: string;
    overrides: ModelOverrides;
}
declare const MODEL_PRESETS: readonly ModelPreset[];
/** Detect which preset matches the current overrides, or "custom". */
declare function detectPreset(overrides: ModelOverrides | undefined): string;
interface ResolvedModelInfo {
    provider: string;
    model: string;
    source: "phase" | "workflow" | "global" | "smart";
}
/** Resolve the effective model for a given phase through the fallback chain. */
declare function resolveModelForPhase(phase: string, overrides: ModelOverrides | undefined, workflowModel: string | undefined, globalModel: string | undefined): ResolvedModelInfo;

/**
 * Step Validation
 *
 * Pure functions for validating workflow steps. Extracted from both
 * frontends to eliminate duplication.
 */

interface StepValidationIssue {
    field: string;
    message: string;
    severity: "warning" | "error";
}
/**
 * Get validation issues for a workflow step.
 * Returns an empty array if the step is fully configured.
 */
declare function getStepValidationIssues(step: UnifiedStep): StepValidationIssue[];
/**
 * Check if a step still needs configuration before it can run.
 */
declare function needsConfig(step: UnifiedStep): boolean;
/**
 * Get a human-readable subtitle/description for a step.
 * Used in the step list to show what the step does at a glance.
 */
declare function getStepSubtitle(step: UnifiedStep, maxLen?: number): string;

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
interface StepIconData {
    /** Icon identifier — apps map this to an actual icon component */
    iconId: string;
    bgClass: string;
    textClass: string;
}
declare const STEP_ICON_DATA: Record<string, StepIconData>;
/** Test sub-type icon overrides */
declare const TEST_ICON_DATA: Record<string, StepIconData>;
/** Icon data for skill categories in the skill catalog */
declare const SKILL_CATEGORY_ICON_DATA: Record<string, StepIconData>;
/**
 * Get icon data for a skill category.
 */
declare function getSkillCategoryIconData(category: string): StepIconData;
/**
 * Get icon data for a step type string.
 */
declare function getStepIconData(stepType: string): StepIconData;
/**
 * Get icon data with fallback: try iconType first, then stepType.
 */
declare function getStepIconDataWithFallback(iconType: string | undefined, stepType: string): StepIconData;
/**
 * Get icon data for a test sub-type.
 */
declare function getTestIconData(testType: string): StepIconData;

/**
 * Parse an output_log string into ChatMessage array.
 *
 * Supports two formats:
 * 1. **Tagged format** (post-persistence): [USER_MESSAGE] and [AI_RESPONSE] blocks
 * 2. **Legacy format**: [USER_MESSAGE] blocks with plain AI text between them
 *
 * Also handles [SESSION_START:N] markers (stripped).
 */
declare function parseOutputLog(outputLog: string): ChatMessage[];
/**
 * Auto-generate a session name from the first user message.
 * Truncates to maxLength and adds ellipsis if needed.
 */
declare function autoNameFromMessage(content: string, maxLength?: number): string;

/**
 * Built-in Skill Definitions
 *
 * 19 built-in skills that ship with Qontinui. Each skill is a named,
 * parameterized template that produces pre-configured step(s).
 *
 * Skill templates use {{parameter_name}} placeholders that are resolved
 * at instantiation time by skill-instantiation.ts.
 */

declare const BUILTIN_SKILLS: readonly SkillDefinition[];

/**
 * Skill Registry
 *
 * Provides search, filter, and lookup functions for skill definitions.
 * Combines built-in skills with user-created skills into a unified catalog.
 */

/**
 * Register user-created skills. Call this when loading from the database.
 */
declare function registerUserSkills(skills: SkillDefinition[]): void;
/**
 * Clear all registered user skills.
 */
declare function clearUserSkills(): void;
/**
 * Get all skills (built-in + user).
 */
declare function getAllSkills(): SkillDefinition[];
/**
 * Get a skill by its ID.
 */
declare function getSkill(id: string): SkillDefinition | undefined;
/**
 * Get a skill by its slug.
 */
declare function getSkillBySlug(slug: string): SkillDefinition | undefined;
/**
 * Get all skills allowed in a given phase.
 */
declare function getSkillsByPhase(phase: WorkflowPhase): SkillDefinition[];
/**
 * Get all skills in a given category.
 */
declare function getSkillsByCategory(category: SkillCategory): SkillDefinition[];
/**
 * Get all unique categories present in the skill catalog.
 */
declare function getSkillCategories(): SkillCategory[];
interface SkillSearchFilters {
    category?: SkillCategory;
    phase?: WorkflowPhase;
    source?: "builtin" | "user" | "community";
    tags?: string[];
}
/**
 * Search skills by text query and optional filters.
 *
 * Text search matches against name, description, slug, and tags.
 * All filters are AND-combined.
 */
declare function searchSkills(query: string, filters?: SkillSearchFilters): SkillDefinition[];

/**
 * Skill Instantiation
 *
 * Resolves a skill template + parameter values into concrete workflow step(s).
 * This is the core "skill → step" transformation.
 *
 * Parameter placeholders in templates use the {{name}} syntax and are replaced
 * with actual values at instantiation time.
 */

/**
 * Validate that all skill dependencies are available in the registry.
 * Returns an array of missing dependency IDs (empty if all are satisfied).
 */
declare function validateDependencies(skill: SkillDefinition): string[];
/**
 * Instantiate a skill into concrete workflow step(s).
 *
 * @param skill - The skill definition to instantiate
 * @param phase - The workflow phase to assign to the produced step(s)
 * @param paramValues - User-provided parameter values
 * @returns Array of concrete steps ready to insert into a workflow
 */
declare function instantiateSkill(skill: SkillDefinition, phase: WorkflowPhase, paramValues: Record<string, unknown>): UnifiedStep[];
/**
 * Instantiate a composition skill by resolving its skill_refs.
 *
 * Each SkillRef is looked up via `getSkill` and instantiated individually.
 * Returns all resulting steps flattened.
 */
declare function instantiateComposition(skill: SkillDefinition, phase: WorkflowPhase, paramValues: Record<string, unknown>): UnifiedStep[];
/**
 * Validate that all required parameters are provided.
 * Returns an array of error messages (empty if valid).
 */
declare function validateSkillParams(skill: SkillDefinition, paramValues: Record<string, unknown>): string[];

/**
 * Skill Checksum Utilities
 *
 * SHA-256 checksums for skill integrity verification on export/import.
 */

/**
 * Compute a SHA-256 checksum of a skill's content.
 * Only hashes deterministic content fields (not usage_count, approval_status).
 */
declare function computeSkillChecksum(skill: SkillDefinition): Promise<string>;
/**
 * Compute a checksum for an entire skill export.
 */
declare function computeExportChecksum(skills: SkillDefinition[]): Promise<string>;

/**
 * Skill Versioning Utilities
 *
 * Provides semantic version bumping and update detection for skills.
 */
type VersionBumpType = "patch" | "minor" | "major";
/**
 * Parse a semantic version string into components.
 */
declare function parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
} | null;
/**
 * Bump a semantic version string.
 */
declare function bumpVersion(version: string, type: VersionBumpType): string;
/**
 * Compare two version strings. Returns:
 * - positive if a > b
 * - negative if a < b
 * - 0 if equal
 */
declare function compareVersions(a: string, b: string): number;
/**
 * Check if a skill has an available update based on checksum comparison.
 *
 * @param localSkill - The locally installed skill
 * @param remoteSkill - The skill from the remote source (import file, org catalog)
 * @returns true if the remote version is newer or has different content
 */
declare function hasUpdate(localSkill: {
    version?: string;
    checksum?: string;
}, remoteSkill: {
    version?: string;
    checksum?: string;
}): boolean;

export { AI_SUMMARY_SETTING, APPROVAL_GATE_SETTING, BUILTIN_SKILLS, type BooleanSettingDef, CONTEXT_MANAGEMENT_SETTING, type CustomSettingDef, GENERATE_CLAUDE_MODELS, GENERATE_GEMINI_MODELS, GENERATE_PROVIDER_OPTIONS, GENERATE_SETTINGS_CONFIG, HEALTH_CHECK_SETTING, HEALTH_CHECK_URLS_SETTING, LOG_SOURCE_SETTING, LOG_WATCH_SETTING, type LogSourceSelection, MAX_ITERATIONS_SETTING, MODELS_BY_PROVIDER, MODEL_OVERRIDE_PHASES, MODEL_PRESETS, MODEL_SETTING, type ModelOption, type ModelPreset, type NumberSettingDef, PER_PHASE_MODEL_SETTING, PROMPT_TEMPLATE_SETTING, PROVIDER_OPTIONS, PROVIDER_SETTING, type ProviderOption, REFLECTION_MODE_SETTING, RESOLVED_MODEL_PREVIEW_SETTING, type ResolvedModelInfo, SKILL_CATEGORY_ICON_DATA, SMART_ROUTING_SENTINEL, STEP_ICON_DATA, STOP_ON_FAILURE_SETTING, type SelectSettingDef, type SettingDef, type SettingsSection, type SkillSearchFilters, type StepIconData, type StepValidationIssue, TEST_ICON_DATA, TIMEOUT_SETTING, type VersionBumpType, WORKFLOW_SETTINGS_CONFIG, autoNameFromMessage, bumpVersion, calculateCompressionSavings, canStepExistInPhase, clearUserSkills, compareVersions, computeExportChecksum, computeSkillChecksum, createDefaultCompressionStatus, createDefaultExecutionStatus, createDefaultHookStatus, createDefaultRetryStatus, createDefaultRoutingStatus, createDefaultStep, createDefaultSubStepStatus, createDefaultWorkflow, createSummaryStep, describeConditions, describeCron, describeInterval, describeSchedule, describeTaskType, detectPreset, detectWorkflowFeatures, formatDuration, formatRelativeTime, formatTokenCount, generateStepId, getAccentColors, getActionColors, getAllSkills, getBooleanDisplayValue, getComplexityDisplayName, getConditionStatusText, getGenerateModels, getHookTriggerDisplayName, getLogSourceValue, getPhaseCount, getSchedulerStatusColor, getSeverityColors, getSkill, getSkillBySlug, getSkillCategories, getSkillCategoryIconData, getSkillsByCategory, getSkillsByPhase, getStatusColors, getStepIconData, getStepIconDataWithFallback, getStepPhase, getStepSubtitle, getStepValidationIssues, getTestIconData, getTimeUntilNextRun, getTotalStepCount, getVisibleSections, getVisibleSettings, hasCompletedSuccessfully, hasConditions, hasUpdate, instantiateComposition, instantiateSkill, isScheduledTaskRunning, isTaskComplete, isTaskFailed, isTaskFinished, isTaskRunning, isWaitingForConditions, isWorkflowEmpty, needsConfig, normalizeToPhases, parseLogSourceValue, parseOutputLog, parseVersion, registerUserSkills, resolveModelForPhase, searchSkills, toBooleanStoredValue, validateDependencies, validateSkillParams };
