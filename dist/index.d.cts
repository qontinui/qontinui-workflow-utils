import { UnifiedStep, WorkflowPhase, UnifiedWorkflow, PromptStep, WorkflowFeatures, WorkflowStage, SkillDefinition, SkillCategory } from '@qontinui/shared-types/workflow';
import { AccentColorClasses, ActionColorClasses, SeverityColorClasses, StatusColorClasses } from '@qontinui/shared-types/library';
import { ScheduleConditions, ScheduleExpression, ScheduledTaskType, ConditionStatus, ScheduledTaskStatus, ScheduledTask } from '@qontinui/shared-types/scheduler';
import { TaskRun } from '@qontinui/shared-types/task-run';
import { CompressionStatus, ExecutionStatus, HookStatus, RetryStatus, RoutingStatus, SubStepStatusDisplay } from '@qontinui/shared-types/execution';
import { ModelOverrides, AiMessage, TransitionAction, StateMachineTransition, PathfindingRequest, PathfindingResult, StateMachineTransitionCreate, StateMachineState, StateMachineConfig, StateMachineExportFormat } from '@qontinui/shared-types';
import { ConstraintCheck, ConstraintSeverity, Constraint, ResourceLimits } from '@qontinui/shared-types/constraints';

declare function generateStepId(): string;
declare function createSummaryStep(): PromptStep;
declare function createDefaultStep(type: UnifiedStep["type"], phase: WorkflowPhase): UnifiedStep;
declare function createDefaultWorkflow(includeSummaryStep?: boolean): Pick<UnifiedWorkflow, "name" | "description" | "setupSteps" | "verificationSteps" | "agenticSteps" | "completionSteps" | "category" | "tags">;

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
    tooltip?: string;
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
declare const WORKFLOW_ARCHITECTURE_SETTING: SelectSettingDef;
declare const PIPELINE_CONFIG_SETTING: CustomSettingDef;
declare const ENFORCE_TOKEN_BUDGET_SETTING: BooleanSettingDef;
declare const STRICT_CWD_SETTING: BooleanSettingDef;
declare const TOOL_TAGS_SETTING: CustomSettingDef;
declare const USE_WORKTREE_SETTING: BooleanSettingDef;
declare const HTN_ENABLED_SETTING: BooleanSettingDef;
declare const HTN_UI_BRIDGE_URL_SETTING: CustomSettingDef;
declare const HTN_STATE_MACHINE_PATH_SETTING: CustomSettingDef;
declare const ROLLBACK_POLICY_SETTING: SelectSettingDef;
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
/** Custom setting definition for per-workflow constraint overrides. */
declare const CONSTRAINT_OVERRIDES_SETTING: CustomSettingDef;
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
declare function getStepValidationIssues(rawStep: UnifiedStep): StepValidationIssue[];
/**
 * Check if a step still needs configuration before it can run.
 */
declare function needsConfig(rawStep: UnifiedStep): boolean;
/**
 * Get a human-readable subtitle/description for a step.
 * Used in the step list to show what the step does at a glance.
 */
declare function getStepSubtitle(rawStep: UnifiedStep, maxLen?: number): string;

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
 * Parse an output_log string into AiMessage array.
 *
 * Supports two formats:
 * 1. **Tagged format** (post-persistence): [USER_MESSAGE] and [AI_RESPONSE] blocks
 * 2. **Legacy format**: [USER_MESSAGE] blocks with plain AI text between them
 *
 * Also handles [SESSION_START:N] markers (stripped).
 */
declare function parseOutputLog(outputLog: string): AiMessage[];
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

/**
 * Graph layout utilities for the state machine graph editor.
 *
 * Provides dagre-based hierarchical layout and grid fallback layout
 * for ReactFlow state machine visualization.
 */

/**
 * Pick a renderable string for the first action's target, falling back to its
 * url field. Some persisted action payloads store `target` as a recognition
 * object (e.g. `{ text: "Abort" }`) instead of the `string | null` the schema
 * declares. Rendering an object as a React child throws React #31, so coerce
 * at the data-prep step.
 */
declare function firstActionTargetString(action: TransitionAction | undefined): string | undefined;
interface LayoutOptions {
    direction?: "TB" | "LR" | "BT" | "RL";
    nodeWidth?: number;
    nodeHeight?: number;
    nodeSep?: number;
    rankSep?: number;
}
/**
 * Default layout options for general graph layout.
 */
declare const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions>;
/**
 * Layout options tuned for the state machine graph editor.
 * Wider nodes and more spacing to accommodate element badges.
 */
declare const STATE_MACHINE_LAYOUT_OPTIONS: Required<LayoutOptions>;
/**
 * Dynamic node size tiers based on element count.
 * Returns { width, gridCols } for the state node component.
 */
declare function getNodeSizeTier(elementCount: number): {
    width: number;
    gridCols: number;
};
interface ElementTypeStyle {
    bg: string;
    text: string;
    border: string;
}
/**
 * Color mapping for element ID prefixes.
 * Used for type-colored badges on state nodes.
 */
declare const ELEMENT_TYPE_STYLES: Record<string, ElementTypeStyle>;
declare const DEFAULT_ELEMENT_TYPE_STYLE: ElementTypeStyle;
/**
 * Get the style for an element based on its ID prefix.
 */
declare function getElementTypeStyle(elementId: string): ElementTypeStyle;
/**
 * Get the type prefix from an element ID.
 */
declare function getElementTypePrefix(elementId: string): string;
/**
 * Color mapping for transition action types (used on edge labels).
 */
declare const ACTION_TYPE_COLORS: Record<string, string>;
declare const DEFAULT_ACTION_TYPE_COLOR = "text-gray-400";
/**
 * Get the color class for an action type.
 */
declare function getActionTypeColor(actionType: string): string;
/**
 * Get the color class for a confidence value.
 */
declare function getConfidenceColor(confidence: number): string;
/**
 * Minimal node/edge interface for layout computation.
 * Compatible with ReactFlow's Node/Edge types without requiring the dependency.
 */
interface LayoutNode {
    id: string;
    position: {
        x: number;
        y: number;
    };
    [key: string]: unknown;
}
interface LayoutEdge {
    id: string;
    source: string;
    target: string;
    [key: string]: unknown;
}
/**
 * Apply hierarchical layout using dagre.
 *
 * This function accepts a dagre instance as a parameter to avoid adding dagre
 * as a direct dependency of this package. The consuming app provides its dagre instance.
 *
 * @param dagreLib - The dagre library instance
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges connecting nodes
 * @param options - Layout configuration
 * @returns Nodes with updated positions and unchanged edges
 */
declare function getLayoutedElements<N extends LayoutNode, E extends LayoutEdge>(dagreLib: {
    graphlib: {
        Graph: new () => DagreGraph;
    };
    layout: (graph: DagreGraph) => void;
}, nodes: N[], edges: E[], options?: LayoutOptions): {
    nodes: N[];
    edges: E[];
};
/**
 * Apply grid layout to nodes (fallback when dagre is unavailable).
 */
declare function getGridLayoutedElements<N extends LayoutNode, E extends LayoutEdge>(nodes: N[], edges: E[], columns?: number, nodeWidth?: number, nodeHeight?: number, spacingX?: number, spacingY?: number): {
    nodes: N[];
    edges: E[];
};
/** Minimal dagre graph interface for type safety */
interface DagreGraph {
    setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
    setGraph(config: Record<string, unknown>): void;
    setNode(id: string, config: Record<string, unknown>): void;
    setEdge(source: string, target: string): void;
    node(id: string): {
        x: number;
        y: number;
    };
}
/**
 * Get the display label from an element ID (part after the colon).
 * For "testid:submit-button", returns "submit-button".
 */
declare function getElementLabel(elementId: string): string;
/**
 * Human-readable labels for transition action types.
 */
declare const ACTION_LABELS: Record<string, string>;
/**
 * Active/in-progress labels for transition action types.
 */
declare const ACTION_ACTIVE_LABELS: Record<string, string>;
/**
 * Full action color config (text, bg, border classes) for each action type.
 */
interface ActionColorConfig {
    text: string;
    bg: string;
    border: string;
}
declare const ACTION_COLOR_CONFIG: Record<string, ActionColorConfig>;
declare const DEFAULT_ACTION_COLOR_CONFIG: ActionColorConfig;
/**
 * Get the full color config for an action type.
 */
declare function getActionColorConfig(actionType: string): ActionColorConfig;
/**
 * Calculate the animation duration for an action (in ms).
 */
declare function computeActionDuration(action: {
    type: string;
    text?: string | null;
    delay_ms?: number | null;
}): number;
interface StateColor {
    border: string;
    bg: string;
    bgSolid: string;
}
/**
 * Color palette for visually differentiating states in spatial views.
 */
declare const STATE_COLORS: readonly StateColor[];
interface SpatialLayoutState {
    state_id: string;
    element_ids: string[];
}
interface SpatialLayoutTransition {
    from_states: string[];
    activate_states: string[];
}
/**
 * Compute a force-directed spatial layout for states based on shared elements
 * and transitions. Returns a map of state_id to position and radius.
 *
 * Uses Jaccard similarity on element_ids for attraction and transition
 * connections for additional attraction. Includes center gravity and
 * repulsion between all pairs.
 */
declare function computeSpatialLayout(states: SpatialLayoutState[], transitions: SpatialLayoutTransition[], canvasWidth: number, canvasHeight: number): Map<string, {
    x: number;
    y: number;
    radius: number;
}>;

/**
 * Client-side pathfinding for the state machine graph editor.
 *
 * These are TypeScript implementations of BFS and Dijkstra for previewing
 * paths in the graph editor UI. They operate on the in-memory state machine
 * data (states + transitions).
 *
 * Runtime navigation uses the qontinui Python library (multistate) which has
 * more sophisticated pathfinding with action execution capabilities.
 */

/**
 * Find a path using BFS (unweighted — ignores path costs).
 * Returns the first path found (shortest by transition count).
 */
declare function findPathBFS(transitions: StateMachineTransition[], request: PathfindingRequest): PathfindingResult;
/**
 * Find a path using Dijkstra's algorithm (weighted — uses path costs).
 * Returns the cheapest path by total path_cost.
 */
declare function findPathDijkstra(transitions: StateMachineTransition[], request: PathfindingRequest): PathfindingResult;
type PathfindingAlgorithm = "bfs" | "dijkstra";
/**
 * Find a path between states using the specified algorithm.
 *
 * @param transitions - All transitions in the state machine
 * @param request - Source and target states
 * @param algorithm - "bfs" for shortest by hop count, "dijkstra" for cheapest by path cost
 */
declare function findPath(transitions: StateMachineTransition[], request: PathfindingRequest, algorithm?: PathfindingAlgorithm): PathfindingResult;

/**
 * State machine validation and derivation utilities.
 *
 * Pure functions for validating state machine data and deriving
 * transition actions from element IDs.
 */

/**
 * Derive a readable action name and TransitionAction from an element ID.
 *
 * Used when creating transitions via drag-and-drop: the element ID prefix
 * determines the default action type.
 *
 * - `url:` or `nav:` → navigate action
 * - `text:` → type action
 * - `role:` with select/option/listbox/combobox/dropdown → select action
 * - Everything else → click action
 */
declare function deriveAction(elementId: string): {
    name: string;
    action: TransitionAction;
};
/**
 * Find a transition between two states (source → target direction).
 */
declare function findExistingTransition(transitions: StateMachineTransition[], sourceStateId: string, targetStateId: string): StateMachineTransition | undefined;
/**
 * Build a transition create payload from a drag-and-drop operation.
 *
 * @param sourceStateId - The state the element is dragged from
 * @param targetStateId - The state the element is dropped onto
 * @param elementId - The element being dragged (determines action type)
 * @returns A StateMachineTransitionCreate ready to submit
 */
declare function buildTransitionFromDrag(sourceStateId: string, targetStateId: string, elementId: string): StateMachineTransitionCreate;
interface ValidationError {
    field: string;
    message: string;
}
/**
 * Validate a state for completeness.
 */
declare function validateState(state: Partial<StateMachineState>): ValidationError[];
/**
 * Validate a transition for completeness.
 */
declare function validateTransition(transition: Partial<StateMachineTransition>): ValidationError[];
/**
 * Check if a transition would create a self-loop (source = target).
 */
declare function isSelfLoop(fromStates: string[], activateStates: string[]): boolean;
/**
 * Count elements by type prefix across all states.
 */
declare function countElementsByType(states: StateMachineState[]): Record<string, number>;
/**
 * Find states that contain a given element.
 */
declare function findStatesWithElement(states: StateMachineState[], elementId: string): StateMachineState[];
/**
 * Get all unique element IDs across all states.
 */
declare function getAllElementIds(states: StateMachineState[]): string[];

/**
 * State machine export/import format utilities.
 *
 * Converts between the internal StateMachineConfig types and the export
 * format compatible with UIBridgeRuntime.from_dict() in the qontinui library.
 */

/**
 * Build the export format from config, states, and transitions.
 * The resulting object is compatible with UIBridgeRuntime.from_dict().
 */
declare function buildExportConfig(config: StateMachineConfig, states: StateMachineState[], transitions: StateMachineTransition[]): StateMachineExportFormat;

/**
 * Chunked state machine graph renderer — pure SCC + chain-compaction utility.
 *
 * Decomposes a state machine's directed graph into a condensation DAG of
 * chunks. Each chunk is either:
 *   - `"scc"` — a strongly-connected component (size > 1, OR a singleton
 *     with a self-loop). Represents an intrinsic cycle in the graph.
 *   - `"chain"` — a merged linear run of chain-eligible singleton SCCs.
 *
 * The resulting `ChunkGraph` always has size <= the original state count,
 * and in practice compresses typical state machines by 5–10x (enough to fit
 * below the WebView2 renderable ceiling of ~150 nodes).
 *
 * This file is pure — no React, no dagre dep. Tarjan's SCC is inlined in
 * iterative form so `qontinui-workflow-utils` stays dep-free.
 */

type ChunkKind = "scc" | "chain";
interface Chunk {
    /** Stable, derived from contained state ids (not insertion order). */
    id: string;
    kind: ChunkKind;
    /**
     * State ids in in-chunk order. For chain chunks, the order follows the
     * path (first → last). For scc chunks, the order is Tarjan output order.
     */
    stateIds: string[];
    /** Auto-derived display name. See "Chunk naming" below. */
    name: string;
    containsInitialState: boolean;
}
interface ChunkEdge {
    from: string;
    to: string;
    transitionCount: number;
    transitionIds: string[];
}
interface ChunkGraph {
    chunks: Chunk[];
    /** One edge per (fromChunk, toChunk) ordered pair, deduplicated. */
    edges: ChunkEdge[];
    /** stateId → chunkId lookup. */
    stateIndex: Map<string, string>;
}
interface ChunkStateMachineOptions {
    /**
     * Optional override for the initial state. When set, the chunk containing
     * this state id is flagged `containsInitialState: true`. If unset, falls
     * back to `extra_metadata.initial === true`, then to `states[0]`.
     */
    initialStateId?: string | null;
}
/**
 * Decompose a state machine into a chunked graph via Tarjan's SCC plus
 * linear chain compaction.
 *
 * - Adjacency is derived from `transitions[].from_states × transitions[].activate_states`.
 * - `exit_states` is IGNORED — deactivation does not create a graph edge.
 * - Self-loops are detected post-SCC: a singleton SCC with a self-edge is
 *   emitted as `kind: "scc"` (intrinsic cycle) and is INELIGIBLE for chain
 *   merging. Pure singletons are chain-eligible.
 * - Chain compaction: a maximal run of chain-eligible singletons `v1 → v2 →
 *   … → vk` is merged into a single chain chunk when each interior edge has
 *   both endpoints chain-eligible, the walked-from vertex has out-degree == 1
 *   in the condensation DAG, and the walked-to vertex has in-degree == 1.
 *   The run's starting vertex additionally requires in-degree <= 1 (it may
 *   have zero, or a single incoming cross-chunk edge, but not two).
 */
declare function chunkStateMachine(states: StateMachineState[], transitions: StateMachineTransition[], options?: ChunkStateMachineOptions): ChunkGraph;

/**
 * Secondary decomposition of giant strongly-connected components.
 *
 * The primary pass in `scc.ts` (`chunkStateMachine`) produces a condensation
 * DAG of SCCs + chain-compacted singletons. When a single SCC is "giant"
 * (typically 150+ states — a bidirectional hub / mesh), there is no further
 * refinement possible with Tarjan, so the ChunkedGraphView falls back to a
 * scrollable list. This module gives that case a structural sub-decomposition:
 *
 *   1. Pick a root (prefer `options.rootStateId`, else max in-degree in the
 *      sub-graph, lexicographic tie-break).
 *   2. Compute the iterative Lengauer-Tarjan dominator tree rooted there.
 *   3. Partition by each direct child of root's dominator subtree — each
 *      subtree is a candidate sub-chunk.
 *   4. Oversized branches (> subChunkMax) are recursively decomposed, capped
 *      at maxDepth.
 *   5. True undirected bridges of the sub-graph's skeleton are detected with
 *      Tarjan's iterative bridge algorithm and emitted via `weakBridgeTransitionIds`
 *      for the UI accent.
 *
 * Per the 2026-04-24 revision of `giant-scc-decomposition.md`, this ships
 * dominator-only — Louvain is deferred pending validation on the real
 * 402-state fixture.
 *
 * Pure: no React, no new runtime deps. Deterministic throughout.
 */

interface SecondaryChunkGraph {
    subChunks: Chunk[];
    edges: Array<{
        from: string;
        to: string;
        transitionCount: number;
        transitionIds: string[];
    }>;
    stateIndex: Map<string, string>;
    weakBridgeTransitionIds: Set<string>;
    method: "dominator" | "louvain" | "mixed";
    /** True when 0 or 1 sub-chunks were produced — caller should show GiantChunkPanel. */
    degenerate: boolean;
}
interface DecomposeGiantSCCOptions {
    rootStateId?: string | null;
    /** Default: 40. Sub-chunks larger than this are recursively decomposed. */
    subChunkMax?: number;
}
/**
 * Decompose a giant SCC into secondary sub-chunks using dominator-tree
 * partitioning, with Tarjan's bridge detection for UI annotation.
 *
 * Termination is bounded by two algorithmic guards (no depth cap):
 *
 *   1. **Base case**: if the input fits under `subChunkMax`, the function
 *      returns `degenerate: true` immediately (no decomposition needed —
 *      the caller treats the whole region as one leaf chunk).
 *   2. **Post-recursion progress check**: after recursing into an oversized
 *      branch, the inner result is accepted only if its largest sub-chunk
 *      is strictly smaller than the branch we recursed on. Otherwise the
 *      recursion is treated as wasted and the branch stays as one big leaf.
 *
 * Together these prevent infinite recursion and bound work to O(n²) in the
 * worst case (slow-shrinkage chain n → n−1 → n−2 → …), which terminates
 * naturally as soon as a sub-chunk fits under `subChunkMax`. For realistic
 * state-machine graphs (≤ ~1000 states per SCC) decomposition typically
 * terminates in 2–3 levels because dominator subtrees roughly halve.
 *
 * Note that a single "tall and narrow" dominator step (root → only-child →
 * many-grandchildren) is handled correctly: Guard 2 lets the recursion
 * descend through the narrow waist before checking for progress, so the
 * grandchildren level still gets its chance to fan out.
 */
declare function decomposeGiantSCC(states: StateMachineState[], transitions: StateMachineTransition[], scc: Chunk, options?: DecomposeGiantSCCOptions): SecondaryChunkGraph;

/**
 * Constraint Engine Utilities
 *
 * Pure helper functions for working with constraint types.
 * Used by both the web and runner frontends.
 */

/**
 * Discriminator union of `ConstraintCheck.type` values.
 * Derived from `ConstraintCheck` so it stays in sync with the generated wire
 * contract even though the generator doesn't emit a standalone enum alias.
 */
type ConstraintCheckType = ConstraintCheck["type"];
/** All built-in constraint IDs shipped with the runner. */
declare const BUILTIN_CONSTRAINT_IDS: readonly ["builtin:no-secrets", "builtin:no-debug-statements", "builtin:no-env-files"];
type BuiltinConstraintId = (typeof BUILTIN_CONSTRAINT_IDS)[number];
/** Returns true if the constraint was shipped as a built-in. */
declare function isBuiltinConstraint(id: string): boolean;
/** Returns true if the constraint was defined in `constraints.toml` by the user. */
declare function isCustomConstraint(id: string): boolean;
/** Returns true if the constraint was proposed by the AI during an agentic phase. */
declare function isAiConstraint(id: string): boolean;
/** Human-readable label for a constraint check type. */
declare function constraintCheckTypeLabel(type: ConstraintCheckType): string;
/** Human-readable label for a severity level. */
declare function severityLabel(severity: ConstraintSeverity): string;
/** Tailwind color class for a severity level (text color). */
declare function severityColor(severity: ConstraintSeverity): string;
/** Tailwind background color class for a severity badge. */
declare function severityBadgeColor(severity: ConstraintSeverity): string;
/**
 * Generate a `project:` constraint ID from a human-readable name.
 *
 * Converts to lowercase, replaces whitespace with hyphens, and strips
 * characters that aren't alphanumeric or hyphens.
 */
declare function generateConstraintId(name: string): string;
/** Default timeout in seconds for command checks (matches Rust default). */
declare const DEFAULT_COMMAND_TIMEOUT_SECS = 30;
/** Default warning threshold fraction (matches Rust default). */
declare const DEFAULT_WARNING_THRESHOLD = 0.75;

/**
 * Constraint TOML Generation
 *
 * Pure functions for serializing in-memory constraint state to TOML format
 * compatible with the Rust `parse_config_str` parser.
 *
 * Used by both the runner and web frontend useConstraints hooks.
 */

/** Escape a TOML string value (wrap in quotes, escape backslashes and quotes). */
declare function tomlString(value: string): string;
/** Format a TOML array of strings on a single line. */
declare function tomlStringArray(values: string[]): string;
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
declare function generateConstraintToml(constraints: Constraint[], resourceLimits: ResourceLimits): string;

export { ACTION_ACTIVE_LABELS, ACTION_COLOR_CONFIG, ACTION_LABELS, ACTION_TYPE_COLORS, AI_SUMMARY_SETTING, APPROVAL_GATE_SETTING, type ActionColorConfig, BUILTIN_CONSTRAINT_IDS, BUILTIN_SKILLS, type BooleanSettingDef, type BuiltinConstraintId, CONSTRAINT_OVERRIDES_SETTING, CONTEXT_MANAGEMENT_SETTING, type Chunk, type ChunkEdge, type ChunkGraph, type ChunkKind, type ChunkStateMachineOptions, type ConstraintCheckType, type CustomSettingDef, DEFAULT_ACTION_COLOR_CONFIG, DEFAULT_ACTION_TYPE_COLOR, DEFAULT_COMMAND_TIMEOUT_SECS, DEFAULT_ELEMENT_TYPE_STYLE, DEFAULT_LAYOUT_OPTIONS, DEFAULT_WARNING_THRESHOLD, type DecomposeGiantSCCOptions, ELEMENT_TYPE_STYLES, ENFORCE_TOKEN_BUDGET_SETTING, type ElementTypeStyle, GENERATE_CLAUDE_MODELS, GENERATE_GEMINI_MODELS, GENERATE_PROVIDER_OPTIONS, GENERATE_SETTINGS_CONFIG, HEALTH_CHECK_SETTING, HEALTH_CHECK_URLS_SETTING, HTN_ENABLED_SETTING, HTN_STATE_MACHINE_PATH_SETTING, HTN_UI_BRIDGE_URL_SETTING, LOG_SOURCE_SETTING, LOG_WATCH_SETTING, type LayoutEdge, type LayoutNode, type LayoutOptions, type LogSourceSelection, MAX_ITERATIONS_SETTING, MODELS_BY_PROVIDER, MODEL_OVERRIDE_PHASES, MODEL_PRESETS, MODEL_SETTING, type ModelOption, type ModelPreset, type NumberSettingDef, PER_PHASE_MODEL_SETTING, PIPELINE_CONFIG_SETTING, PROMPT_TEMPLATE_SETTING, PROVIDER_OPTIONS, PROVIDER_SETTING, type PathfindingAlgorithm, type ProviderOption, REFLECTION_MODE_SETTING, RESOLVED_MODEL_PREVIEW_SETTING, ROLLBACK_POLICY_SETTING, type ResolvedModelInfo, SKILL_CATEGORY_ICON_DATA, SMART_ROUTING_SENTINEL, STATE_COLORS, STATE_MACHINE_LAYOUT_OPTIONS, STEP_ICON_DATA, STOP_ON_FAILURE_SETTING, STRICT_CWD_SETTING, type SecondaryChunkGraph, type SelectSettingDef, type SettingDef, type SettingsSection, type SkillSearchFilters, type StateColor, type StepIconData, type StepValidationIssue, TEST_ICON_DATA, TIMEOUT_SETTING, TOOL_TAGS_SETTING, USE_WORKTREE_SETTING, type ValidationError, type VersionBumpType, WORKFLOW_ARCHITECTURE_SETTING, WORKFLOW_SETTINGS_CONFIG, autoNameFromMessage, buildExportConfig, buildTransitionFromDrag, bumpVersion, calculateCompressionSavings, canStepExistInPhase, chunkStateMachine, clearUserSkills, compareVersions, computeActionDuration, computeExportChecksum, computeSkillChecksum, computeSpatialLayout, constraintCheckTypeLabel, countElementsByType, createDefaultCompressionStatus, createDefaultExecutionStatus, createDefaultHookStatus, createDefaultRetryStatus, createDefaultRoutingStatus, createDefaultStep, createDefaultSubStepStatus, createDefaultWorkflow, createSummaryStep, decomposeGiantSCC, deriveAction, describeConditions, describeCron, describeInterval, describeSchedule, describeTaskType, detectPreset, detectWorkflowFeatures, findExistingTransition, findPath, findPathBFS, findPathDijkstra, findStatesWithElement, firstActionTargetString, formatDuration, formatRelativeTime, formatTokenCount, generateConstraintId, generateConstraintToml, generateStepId, getAccentColors, getActionColorConfig, getActionColors, getActionTypeColor, getAllElementIds, getAllSkills, getBooleanDisplayValue, getComplexityDisplayName, getConditionStatusText, getConfidenceColor, getElementLabel, getElementTypePrefix, getElementTypeStyle, getGenerateModels, getGridLayoutedElements, getHookTriggerDisplayName, getLayoutedElements, getLogSourceValue, getNodeSizeTier, getPhaseCount, getSchedulerStatusColor, getSeverityColors, getSkill, getSkillBySlug, getSkillCategories, getSkillCategoryIconData, getSkillsByCategory, getSkillsByPhase, getStatusColors, getStepIconData, getStepIconDataWithFallback, getStepPhase, getStepSubtitle, getStepValidationIssues, getTestIconData, getTimeUntilNextRun, getTotalStepCount, getVisibleSections, getVisibleSettings, hasCompletedSuccessfully, hasConditions, hasUpdate, instantiateComposition, instantiateSkill, isAiConstraint, isBuiltinConstraint, isCustomConstraint, isScheduledTaskRunning, isSelfLoop, isTaskComplete, isTaskFailed, isTaskFinished, isTaskRunning, isWaitingForConditions, isWorkflowEmpty, needsConfig, normalizeToPhases, parseLogSourceValue, parseOutputLog, parseVersion, registerUserSkills, resolveModelForPhase, searchSkills, severityBadgeColor, severityColor, severityLabel, toBooleanStoredValue, tomlString, tomlStringArray, validateDependencies, validateSkillParams, validateState, validateTransition };
