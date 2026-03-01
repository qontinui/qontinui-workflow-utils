import { UnifiedStep, WorkflowPhase, UnifiedWorkflow, PromptStep, WorkflowFeatures, WorkflowStage } from '@qontinui/shared-types/workflow';
import { AccentColorClasses, ActionColorClasses, SeverityColorClasses, StatusColorClasses } from '@qontinui/shared-types/library';
import { ScheduleConditions, ScheduleExpression, ScheduledTaskType, ConditionStatus, ScheduledTaskStatus, ScheduledTask } from '@qontinui/shared-types/scheduler';
import { TaskRun } from '@qontinui/shared-types/task-run';
import { CompressionStatus, ExecutionStatus, HookStatus, RetryStatus, RoutingStatus, SubStepStatusDisplay } from '@qontinui/shared-types/execution';
import { ChatMessage } from '@qontinui/shared-types';

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

export { AI_SUMMARY_SETTING, type BooleanSettingDef, CONTEXT_MANAGEMENT_SETTING, type CustomSettingDef, GENERATE_CLAUDE_MODELS, GENERATE_GEMINI_MODELS, GENERATE_PROVIDER_OPTIONS, GENERATE_SETTINGS_CONFIG, HEALTH_CHECK_SETTING, HEALTH_CHECK_URLS_SETTING, LOG_SOURCE_SETTING, LOG_WATCH_SETTING, type LogSourceSelection, MAX_ITERATIONS_SETTING, MODELS_BY_PROVIDER, MODEL_SETTING, type ModelOption, type NumberSettingDef, PROMPT_TEMPLATE_SETTING, PROVIDER_OPTIONS, PROVIDER_SETTING, type ProviderOption, REFLECTION_MODE_SETTING, STEP_ICON_DATA, STOP_ON_FAILURE_SETTING, type SelectSettingDef, type SettingDef, type SettingsSection, type StepIconData, type StepValidationIssue, TEST_ICON_DATA, TIMEOUT_SETTING, WORKFLOW_SETTINGS_CONFIG, autoNameFromMessage, calculateCompressionSavings, canStepExistInPhase, createDefaultCompressionStatus, createDefaultExecutionStatus, createDefaultHookStatus, createDefaultRetryStatus, createDefaultRoutingStatus, createDefaultStep, createDefaultSubStepStatus, createDefaultWorkflow, createSummaryStep, describeConditions, describeCron, describeInterval, describeSchedule, describeTaskType, detectWorkflowFeatures, formatDuration, formatRelativeTime, formatTokenCount, generateStepId, getAccentColors, getActionColors, getBooleanDisplayValue, getComplexityDisplayName, getConditionStatusText, getGenerateModels, getHookTriggerDisplayName, getLogSourceValue, getPhaseCount, getSchedulerStatusColor, getSeverityColors, getStatusColors, getStepIconData, getStepIconDataWithFallback, getStepPhase, getStepSubtitle, getStepValidationIssues, getTestIconData, getTimeUntilNextRun, getTotalStepCount, getVisibleSections, getVisibleSettings, hasCompletedSuccessfully, hasConditions, isScheduledTaskRunning, isTaskComplete, isTaskFailed, isTaskFinished, isTaskRunning, isWaitingForConditions, isWorkflowEmpty, needsConfig, normalizeToPhases, parseLogSourceValue, parseOutputLog, toBooleanStoredValue };
