"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AI_SUMMARY_SETTING: () => AI_SUMMARY_SETTING,
  CONTEXT_MANAGEMENT_SETTING: () => CONTEXT_MANAGEMENT_SETTING,
  GENERATE_CLAUDE_MODELS: () => GENERATE_CLAUDE_MODELS,
  GENERATE_GEMINI_MODELS: () => GENERATE_GEMINI_MODELS,
  GENERATE_PROVIDER_OPTIONS: () => GENERATE_PROVIDER_OPTIONS,
  GENERATE_SETTINGS_CONFIG: () => GENERATE_SETTINGS_CONFIG,
  HEALTH_CHECK_SETTING: () => HEALTH_CHECK_SETTING,
  HEALTH_CHECK_URLS_SETTING: () => HEALTH_CHECK_URLS_SETTING,
  LOG_SOURCE_SETTING: () => LOG_SOURCE_SETTING,
  LOG_WATCH_SETTING: () => LOG_WATCH_SETTING,
  MAX_ITERATIONS_SETTING: () => MAX_ITERATIONS_SETTING,
  MODELS_BY_PROVIDER: () => MODELS_BY_PROVIDER,
  MODEL_SETTING: () => MODEL_SETTING,
  PROMPT_TEMPLATE_SETTING: () => PROMPT_TEMPLATE_SETTING,
  PROVIDER_OPTIONS: () => PROVIDER_OPTIONS,
  PROVIDER_SETTING: () => PROVIDER_SETTING,
  REFLECTION_MODE_SETTING: () => REFLECTION_MODE_SETTING,
  STEP_ICON_DATA: () => STEP_ICON_DATA,
  STOP_ON_FAILURE_SETTING: () => STOP_ON_FAILURE_SETTING,
  TEST_ICON_DATA: () => TEST_ICON_DATA,
  TIMEOUT_SETTING: () => TIMEOUT_SETTING,
  WORKFLOW_SETTINGS_CONFIG: () => WORKFLOW_SETTINGS_CONFIG,
  autoNameFromMessage: () => autoNameFromMessage,
  calculateCompressionSavings: () => calculateCompressionSavings,
  canStepExistInPhase: () => canStepExistInPhase,
  createDefaultCompressionStatus: () => createDefaultCompressionStatus,
  createDefaultExecutionStatus: () => createDefaultExecutionStatus,
  createDefaultHookStatus: () => createDefaultHookStatus,
  createDefaultRetryStatus: () => createDefaultRetryStatus,
  createDefaultRoutingStatus: () => createDefaultRoutingStatus,
  createDefaultStep: () => createDefaultStep,
  createDefaultSubStepStatus: () => createDefaultSubStepStatus,
  createDefaultWorkflow: () => createDefaultWorkflow,
  createSummaryStep: () => createSummaryStep,
  describeConditions: () => describeConditions,
  describeCron: () => describeCron,
  describeInterval: () => describeInterval,
  describeSchedule: () => describeSchedule,
  describeTaskType: () => describeTaskType,
  detectWorkflowFeatures: () => detectWorkflowFeatures,
  formatDuration: () => formatDuration,
  formatRelativeTime: () => formatRelativeTime,
  formatTokenCount: () => formatTokenCount,
  generateStepId: () => generateStepId,
  getAccentColors: () => getAccentColors,
  getActionColors: () => getActionColors,
  getBooleanDisplayValue: () => getBooleanDisplayValue,
  getComplexityDisplayName: () => getComplexityDisplayName,
  getConditionStatusText: () => getConditionStatusText,
  getGenerateModels: () => getGenerateModels,
  getHookTriggerDisplayName: () => getHookTriggerDisplayName,
  getLogSourceValue: () => getLogSourceValue,
  getPhaseCount: () => getPhaseCount,
  getSchedulerStatusColor: () => getSchedulerStatusColor,
  getSeverityColors: () => getSeverityColors,
  getStatusColors: () => getStatusColors,
  getStepIconData: () => getStepIconData,
  getStepIconDataWithFallback: () => getStepIconDataWithFallback,
  getStepPhase: () => getStepPhase,
  getStepSubtitle: () => getStepSubtitle,
  getStepValidationIssues: () => getStepValidationIssues,
  getTestIconData: () => getTestIconData,
  getTimeUntilNextRun: () => getTimeUntilNextRun,
  getTotalStepCount: () => getTotalStepCount,
  getVisibleSections: () => getVisibleSections,
  getVisibleSettings: () => getVisibleSettings,
  hasCompletedSuccessfully: () => hasCompletedSuccessfully,
  hasConditions: () => hasConditions,
  isScheduledTaskRunning: () => isScheduledTaskRunning,
  isTaskComplete: () => isTaskComplete,
  isTaskFailed: () => isTaskFailed,
  isTaskFinished: () => isTaskFinished,
  isTaskRunning: () => isTaskRunning,
  isWaitingForConditions: () => isWaitingForConditions,
  isWorkflowEmpty: () => isWorkflowEmpty,
  needsConfig: () => needsConfig,
  normalizeToPhases: () => normalizeToPhases,
  parseLogSourceValue: () => parseLogSourceValue,
  parseOutputLog: () => parseOutputLog,
  toBooleanStoredValue: () => toBooleanStoredValue
});
module.exports = __toCommonJS(index_exports);

// src/workflow-factories.ts
var import_workflow = require("@qontinui/shared-types/workflow");
function generateStepId() {
  return crypto.randomUUID();
}
function createSummaryStep() {
  return {
    id: crypto.randomUUID(),
    type: "prompt",
    phase: "completion",
    name: "AI Summary",
    content: import_workflow.DEFAULT_SUMMARY_PROMPT,
    is_summary_step: true
  };
}
function createDefaultStep(type, phase) {
  const id = generateStepId();
  switch (type) {
    case "command":
      return {
        id,
        type: "command",
        phase,
        name: "Command",
        mode: "shell",
        command: ""
      };
    case "ui_bridge":
      return {
        id,
        type: "ui_bridge",
        phase,
        name: "UI Bridge",
        action: "snapshot"
      };
    case "prompt": {
      const promptNames = {
        setup: "AI Setup Task",
        verification: "AI Verification",
        agentic: "Prompt",
        completion: "AI Completion Task"
      };
      return {
        id,
        type: "prompt",
        phase,
        name: promptNames[phase] ?? "Prompt",
        content: ""
      };
    }
    case "workflow":
      return {
        id,
        type: "workflow",
        phase,
        name: "Workflow",
        workflow_id: "",
        workflow_name: ""
      };
    default:
      throw new Error(`Unknown step type: ${type}`);
  }
}
function createDefaultWorkflow(includeSummaryStep = true) {
  return {
    name: "",
    description: "",
    setup_steps: [],
    verification_steps: [],
    agentic_steps: [],
    completion_steps: includeSummaryStep ? [createSummaryStep()] : [],
    category: "general",
    tags: []
  };
}

// src/workflow-queries.ts
function detectWorkflowFeatures(workflow) {
  const allSteps = [
    ...workflow.setup_steps,
    ...workflow.verification_steps,
    ...workflow.agentic_steps,
    ...workflow.completion_steps ?? [],
    ...(workflow.stages ?? []).flatMap((s) => [
      ...s.setup_steps,
      ...s.verification_steps,
      ...s.agentic_steps,
      ...s.completion_steps ?? []
    ])
  ];
  const hasSetup = workflow.setup_steps.length > 0 || (workflow.stages ?? []).some((s) => s.setup_steps.length > 0);
  const hasVerification = workflow.verification_steps.length > 0 || (workflow.stages ?? []).some((s) => s.verification_steps.length > 0);
  const hasAgentic = workflow.agentic_steps.length > 0 || (workflow.stages ?? []).some((s) => s.agentic_steps.length > 0);
  const hasCompletion = (workflow.completion_steps ?? []).length > 0 || (workflow.stages ?? []).some(
    (s) => (s.completion_steps ?? []).length > 0
  );
  const hasUiBridge = allSteps.some((s) => s.type === "ui_bridge");
  const hasAiPrompts = allSteps.some((s) => s.type === "prompt");
  return {
    hasSetup,
    hasVerification,
    hasAgentic,
    hasCompletion,
    hasUiBridge,
    showIterationSettings: hasAgentic,
    hasAiPrompts
  };
}
function isWorkflowEmpty(workflow) {
  if ((workflow.stages ?? []).length > 0) return false;
  const completionSteps = workflow.completion_steps ?? [];
  const hasOnlySummaryStep = completionSteps.length === 0 || completionSteps.length === 1 && completionSteps[0].type === "prompt" && completionSteps[0].is_summary_step === true;
  return workflow.setup_steps.length === 0 && workflow.verification_steps.length === 0 && workflow.agentic_steps.length === 0 && hasOnlySummaryStep;
}
function getTotalStepCount(workflow) {
  const topLevelCount = workflow.setup_steps.length + workflow.verification_steps.length + workflow.agentic_steps.length + (workflow.completion_steps ?? []).length;
  const stagesCount = (workflow.stages ?? []).reduce(
    (sum, s) => sum + s.setup_steps.length + s.verification_steps.length + s.agentic_steps.length + (s.completion_steps ?? []).length,
    0
  );
  return topLevelCount + stagesCount;
}
function getStepPhase(step) {
  return step.phase;
}
function canStepExistInPhase(stepType, phase) {
  if (phase === "agentic") return stepType === "prompt";
  switch (stepType) {
    case "command":
    case "ui_bridge":
    case "prompt":
    case "workflow":
      return true;
    default:
      return false;
  }
}
function normalizeToPhases(workflow) {
  if (workflow.stages && workflow.stages.length > 0) return workflow.stages;
  return [
    {
      id: workflow.id + "-phase-1",
      name: workflow.name,
      description: workflow.description,
      setup_steps: workflow.setup_steps,
      verification_steps: workflow.verification_steps,
      agentic_steps: workflow.agentic_steps,
      completion_steps: workflow.completion_steps ?? [],
      max_iterations: workflow.max_iterations,
      timeout_seconds: workflow.timeout_seconds,
      provider: workflow.provider,
      model: workflow.model
    }
  ];
}
function getPhaseCount(workflow) {
  return normalizeToPhases(workflow).length;
}

// src/formatting.ts
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  const minutes = Math.floor(ms / 6e4);
  const seconds = Math.floor(ms % 6e4 / 1e3);
  return `${minutes}m ${seconds}s`;
}
function formatRelativeTime(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1e3);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function formatTokenCount(tokens) {
  if (tokens < 1e3) return tokens.toString();
  if (tokens < 1e4) return `${(tokens / 1e3).toFixed(1)}K`;
  return `${Math.round(tokens / 1e3)}K`;
}

// src/color-data.ts
var SEVERITY_COLORS = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
    dot: "bg-red-500"
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/30",
    dot: "bg-orange-500"
  },
  medium: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500"
  },
  low: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/30",
    dot: "bg-blue-500"
  },
  info: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-500"
  }
};
function getSeverityColors(severity) {
  return SEVERITY_COLORS[severity] || {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground"
  };
}
var STATUS_COLORS = {
  idle: {
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "text-muted-foreground"
  },
  running: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: "text-emerald-400",
    pulse: "animate-pulse"
  },
  success: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/30",
    icon: "text-green-500"
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
    icon: "text-red-500"
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
    icon: "text-yellow-500"
  },
  pending: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: "text-blue-400"
  },
  paused: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: "text-amber-400"
  },
  cancelled: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    icon: "text-slate-400"
  }
};
function getStatusColors(status) {
  return STATUS_COLORS[status] || {
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "text-muted-foreground"
  };
}
var ACTION_COLORS = {
  auto_fix: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/30",
    badge: "bg-green-500"
  },
  needs_user_input: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/30",
    badge: "bg-amber-500"
  },
  manual: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    badge: "bg-blue-500"
  },
  informational: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    badge: "bg-slate-500"
  },
  skip: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    badge: "bg-muted-foreground"
  },
  defer: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    badge: "bg-purple-500"
  }
};
function getActionColors(actionType) {
  return ACTION_COLORS[actionType] || {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    badge: "bg-muted-foreground"
  };
}
var ACCENT_COLORS = {
  red: {
    bg: "bg-red-500/10",
    bgSolid: "bg-red-500",
    text: "text-red-500",
    border: "border-red-500/30"
  },
  orange: {
    bg: "bg-orange-500/10",
    bgSolid: "bg-orange-500",
    text: "text-orange-500",
    border: "border-orange-500/30"
  },
  amber: {
    bg: "bg-amber-500/10",
    bgSolid: "bg-amber-500",
    text: "text-amber-500",
    border: "border-amber-500/30"
  },
  yellow: {
    bg: "bg-yellow-500/10",
    bgSolid: "bg-yellow-500",
    text: "text-yellow-500",
    border: "border-yellow-500/30"
  },
  green: {
    bg: "bg-green-500/10",
    bgSolid: "bg-green-500",
    text: "text-green-500",
    border: "border-green-500/30"
  },
  emerald: {
    bg: "bg-emerald-500/10",
    bgSolid: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30"
  },
  blue: {
    bg: "bg-blue-500/10",
    bgSolid: "bg-blue-500",
    text: "text-blue-400",
    border: "border-blue-500/30"
  },
  cyan: {
    bg: "bg-cyan-500/10",
    bgSolid: "bg-cyan-500",
    text: "text-cyan-400",
    border: "border-cyan-500/30"
  },
  purple: {
    bg: "bg-purple-500/10",
    bgSolid: "bg-purple-500",
    text: "text-purple-400",
    border: "border-purple-500/30"
  },
  slate: {
    bg: "bg-slate-500/10",
    bgSolid: "bg-slate-500",
    text: "text-slate-400",
    border: "border-slate-500/30"
  }
};
function getAccentColors(color) {
  return ACCENT_COLORS[color] || {
    bg: "bg-muted/50",
    bgSolid: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border"
  };
}

// src/scheduler-utils.ts
function describeSchedule(schedule) {
  switch (schedule.type) {
    case "Once":
      try {
        return `Once at ${new Date(schedule.value).toLocaleString()}`;
      } catch {
        return `Once at ${schedule.value}`;
      }
    case "Cron":
      return describeCron(schedule.value);
    case "Interval":
      return describeInterval(schedule.value);
    case "State":
      return `On state: ${schedule.state_id}`;
  }
}
function describeCron(cron) {
  const patterns = {
    "0 0 * * * *": "Every hour",
    "0 0 0 * * *": "Every day at midnight",
    "0 0 9 * * *": "Every day at 9 AM",
    "0 0 9 * * 1-5": "Weekdays at 9 AM",
    "0 0 0 * * 0": "Every Sunday at midnight",
    "0 0 0 1 * *": "First day of every month"
  };
  return patterns[cron] ?? `Cron: ${cron}`;
}
function describeInterval(seconds) {
  if (seconds < 60) return `Every ${seconds} seconds`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `Every ${m} minute${m > 1 ? "s" : ""}`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `Every ${h} hour${h > 1 ? "s" : ""}`;
  }
  const d = Math.floor(seconds / 86400);
  return `Every ${d} day${d > 1 ? "s" : ""}`;
}
function describeTaskType(task) {
  switch (task.task_type) {
    case "Workflow":
      return `Workflow: ${task.workflow_name}`;
    case "Prompt":
      return `Prompt: ${task.prompt_id}`;
    case "AutoFix":
      return "Auto-Fix";
  }
}
function getSchedulerStatusColor(status) {
  switch (status) {
    case "pending":
      return "text-muted-foreground";
    case "running":
      return "text-blue-500";
    case "completed":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "skipped":
      return "text-yellow-500";
    case "cancelled":
      return "text-text-muted";
  }
}
function isScheduledTaskRunning(task) {
  return task.last_run?.status === "running";
}
function hasCompletedSuccessfully(task) {
  return task.last_run?.success === true;
}
function getTimeUntilNextRun(task) {
  if (!task.next_run) return null;
  try {
    const diff = new Date(task.next_run).getTime() - Date.now();
    if (diff < 0) return "Overdue";
    const seconds = Math.floor(diff / 1e3);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } catch {
    return null;
  }
}
function isWaitingForConditions(task) {
  return task.condition_status !== void 0 && task.condition_status !== null;
}
function hasConditions(task) {
  if (!task.conditions) return false;
  const idleEnabled = task.conditions.require_idle?.enabled ?? false;
  const repoEnabled = task.conditions.require_repo_inactive?.enabled === true && (task.conditions.require_repo_inactive?.repositories?.length ?? 0) > 0;
  return idleEnabled || repoEnabled;
}
function describeConditions(conditions) {
  const parts = [];
  if (conditions.require_idle?.enabled) parts.push("Wait for idle");
  if (conditions.require_repo_inactive?.enabled) {
    const repos = conditions.require_repo_inactive.repositories;
    if (repos.length === 1)
      parts.push(
        `Wait for repo inactive (${repos[0].inactive_minutes}min)`
      );
    else if (repos.length > 1)
      parts.push(`Wait for ${repos.length} repos inactive`);
  }
  if (conditions.timeout_minutes)
    parts.push(`timeout: ${conditions.timeout_minutes}min`);
  return parts.length > 0 ? parts.join(", ") : "No conditions";
}
function getConditionStatusText(status) {
  if (status.timed_out) return "Timed out";
  const parts = [];
  if (status.idle_met !== void 0)
    parts.push(status.idle_met ? "Idle" : "Waiting for idle");
  if (status.repo_inactive_met) {
    const inactive = status.repo_inactive_met.filter(
      ([, met]) => met
    ).length;
    const total = status.repo_inactive_met.length;
    parts.push(
      inactive === total ? "Repos inactive" : `Repos: ${inactive}/${total} inactive`
    );
  }
  return parts.length > 0 ? parts.join(", ") : "Checking conditions...";
}

// src/task-run-utils.ts
function isTaskRunning(task) {
  return task.status === "running";
}
function isTaskComplete(task) {
  return task.status === "complete";
}
function isTaskFailed(task) {
  return task.status === "failed" || task.status === "stopped";
}
function isTaskFinished(task) {
  return task.status !== "running";
}

// src/execution-status-defaults.ts
function createDefaultRoutingStatus() {
  return {
    enabled: false,
    decision: null,
    config: {
      simpleModel: "claude-3-5-haiku-20241022",
      mediumModel: "claude-sonnet-4-20250514",
      complexModel: "claude-opus-4-20250514"
    }
  };
}
function createDefaultRetryStatus() {
  return {
    enabled: true,
    maxRetries: 3,
    feedbackInjection: true,
    state: {
      attempt: 0,
      lastError: null,
      lastAttemptAt: null,
      totalDelayMs: 0,
      errorHistory: []
    },
    nextRetryDelayMs: null,
    exhausted: false
  };
}
function createDefaultCompressionStatus() {
  return {
    enabled: true,
    thresholdTokens: 8e4,
    targetTokens: 6e4,
    currentTokenCount: null,
    lastCompression: null,
    thresholdPercentage: 0,
    compressionImminent: false
  };
}
function createDefaultHookStatus() {
  return {
    hooks: [],
    executionHistory: [],
    currentlyExecuting: null
  };
}
function createDefaultSubStepStatus() {
  return {
    current: null,
    steps: [],
    progressPercent: 0,
    completedCount: 0,
    totalCount: 0,
    isActive: false,
    currentPhase: null
  };
}
function createDefaultExecutionStatus() {
  return {
    taskRunId: null,
    taskName: null,
    iteration: 0,
    status: "idle",
    routing: createDefaultRoutingStatus(),
    retry: createDefaultRetryStatus(),
    compression: createDefaultCompressionStatus(),
    hooks: createDefaultHookStatus(),
    subSteps: createDefaultSubStepStatus(),
    lastUpdated: Date.now()
  };
}
function getComplexityDisplayName(complexity) {
  return { simple: "Simple", medium: "Medium", complex: "Complex" }[complexity];
}
function getHookTriggerDisplayName(trigger) {
  const names = {
    pre_execution: "Pre-Execution",
    post_execution: "Post-Execution",
    on_error: "On Error",
    on_verification_fail: "On Verification Fail",
    on_complete: "On Complete",
    pre_iteration: "Pre-Iteration",
    post_iteration: "Post-Iteration"
  };
  return names[trigger] ?? trigger;
}
function calculateCompressionSavings(result) {
  if (result.originalTokens === 0) return 0;
  return (result.originalTokens - result.compressedTokens) / result.originalTokens * 100;
}

// src/workflow-settings.ts
var PROVIDER_OPTIONS = [
  { value: "", label: "Use Default (from Settings)" },
  { value: "claude_cli", label: "Claude CLI" },
  { value: "anthropic_api", label: "Anthropic API" },
  { value: "openai_api", label: "OpenAI API" },
  { value: "gemini_api", label: "Gemini API" }
];
var MODELS_BY_PROVIDER = {
  claude_cli: [
    { value: "", label: "Default" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" }
  ],
  anthropic_api: [
    { value: "", label: "Default" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" }
  ],
  openai_api: [
    { value: "", label: "Default" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1-mini" }
  ],
  gemini_api: [
    { value: "", label: "Default" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
  ]
};
var GENERATE_PROVIDER_OPTIONS = [
  { value: "claude_cli", label: "Claude CLI" },
  { value: "claude_api", label: "Claude API" },
  { value: "gemini_cli", label: "Gemini CLI" },
  { value: "gemini_api", label: "Gemini API" }
];
var GENERATE_CLAUDE_MODELS = [
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-opus", label: "Claude 3 Opus" }
];
var GENERATE_GEMINI_MODELS = [
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" }
];
function getGenerateModels(provider) {
  if (provider.startsWith("claude")) return GENERATE_CLAUDE_MODELS;
  if (provider.startsWith("gemini")) return GENERATE_GEMINI_MODELS;
  return [];
}
function getLogSourceValue(selection) {
  if (!selection) return "default";
  if (typeof selection === "string") return selection;
  if (typeof selection === "object" && "profile_id" in selection) {
    return `profile:${selection.profile_id}`;
  }
  return "default";
}
function parseLogSourceValue(value) {
  if (value === "default") return void 0;
  if (value === "ai" || value === "all") return value;
  if (value.startsWith("profile:")) {
    return { profile_id: value.slice("profile:".length) };
  }
  return void 0;
}
var REFLECTION_MODE_SETTING = {
  key: "reflection_mode",
  type: "boolean",
  label: "Reflection mode",
  defaultValue: true,
  tooltip: "Investigates root causes before fixing failures. The AI will research related code, use subagents for exploration, and document findings before implementing changes. Uses significantly more tokens and takes longer. Enable for complex or recurring failures where quick fixes keep missing the real issue."
};
var STOP_ON_FAILURE_SETTING = {
  key: "stop_on_failure",
  type: "boolean",
  label: "Stop on failure",
  defaultValue: false,
  tooltip: "Stop the workflow immediately when a step fails instead of continuing."
};
var LOG_WATCH_SETTING = {
  key: "log_watch_enabled",
  type: "boolean",
  label: "Enable log watching",
  defaultValue: true,
  tooltip: "Scan backend and frontend logs for errors before each verification."
};
var HEALTH_CHECK_SETTING = {
  key: "health_check_enabled",
  type: "boolean",
  label: "Enable health checks",
  defaultValue: true,
  tooltip: "Verify configured servers are running before verification."
};
var AI_SUMMARY_SETTING = {
  key: "skip_ai_summary",
  type: "boolean",
  label: "Generate AI summary",
  defaultValue: false,
  invertDisplay: true,
  tooltip: "Generate an AI summary of the workflow execution.",
  visible: (f) => f.hasAiPrompts
};
var MAX_ITERATIONS_SETTING = {
  key: "max_iterations",
  type: "number",
  label: "Max Iterations",
  defaultValue: 10,
  min: 1,
  max: 100,
  description: "Maximum number of verification \u2194 agentic loops",
  visible: (f) => f.showIterationSettings
};
var TIMEOUT_SETTING = {
  key: "timeout_seconds",
  type: "number",
  label: "AI Timeout (seconds)",
  placeholder: "No timeout",
  min: 60,
  max: 7200,
  description: "Kill AI session after N seconds of inactivity",
  visible: (f) => f.showIterationSettings
};
var PROVIDER_SETTING = {
  key: "provider",
  type: "select",
  label: "AI Provider",
  defaultValue: "",
  options: PROVIDER_OPTIONS,
  visible: (f) => f.hasAiPrompts
};
var MODEL_SETTING = {
  key: "model",
  type: "custom",
  label: "AI Model",
  customType: "model_select",
  visible: (f) => f.hasAiPrompts
};
var LOG_SOURCE_SETTING = {
  key: "log_source_selection",
  type: "custom",
  label: "Log Sources",
  customType: "log_source_select",
  visible: (f) => f.showIterationSettings
};
var HEALTH_CHECK_URLS_SETTING = {
  key: "health_check_urls",
  type: "custom",
  label: "Health Check URLs",
  customType: "health_check_urls"
};
var PROMPT_TEMPLATE_SETTING = {
  key: "prompt_template",
  type: "custom",
  label: "Developer Prompt Template",
  customType: "prompt_template",
  visible: (f) => f.showIterationSettings
};
var CONTEXT_MANAGEMENT_SETTING = {
  key: "contexts",
  type: "custom",
  label: "AI Contexts",
  customType: "context_management",
  visible: (f) => f.hasAiPrompts
};
var WORKFLOW_SETTINGS_CONFIG = [
  {
    id: "identity",
    label: "Identity",
    settings: [
      { key: "name", type: "custom", label: "Name", customType: "name_input" },
      {
        key: "description",
        type: "custom",
        label: "Description",
        customType: "description_input"
      }
    ]
  },
  {
    id: "iteration",
    label: "Iteration",
    settings: [MAX_ITERATIONS_SETTING, TIMEOUT_SETTING]
  },
  {
    id: "ai",
    label: "AI Configuration",
    settings: [
      REFLECTION_MODE_SETTING,
      PROVIDER_SETTING,
      MODEL_SETTING,
      AI_SUMMARY_SETTING
    ]
  },
  {
    id: "monitoring",
    label: "Monitoring",
    settings: [
      HEALTH_CHECK_SETTING,
      HEALTH_CHECK_URLS_SETTING,
      LOG_WATCH_SETTING,
      LOG_SOURCE_SETTING
    ]
  },
  {
    id: "advanced",
    label: "Advanced",
    settings: [
      PROMPT_TEMPLATE_SETTING,
      CONTEXT_MANAGEMENT_SETTING,
      STOP_ON_FAILURE_SETTING
    ]
  },
  {
    id: "metadata",
    label: "Metadata",
    settings: [
      {
        key: "category",
        type: "custom",
        label: "Category",
        customType: "category_input"
      },
      {
        key: "tags",
        type: "custom",
        label: "Tags",
        customType: "tags_input"
      }
    ]
  }
];
var GENERATE_SETTINGS_CONFIG = [
  {
    key: "reflectionMode",
    type: "boolean",
    label: "Reflection mode",
    defaultValue: true,
    tooltip: REFLECTION_MODE_SETTING.tooltip
  },
  {
    key: "includeUIBridge",
    type: "boolean",
    label: "Include UI Bridge SDK",
    defaultValue: true,
    tooltip: "Include UI Bridge SDK instructions in generated workflows."
  },
  {
    key: "autoIncludeContexts",
    type: "boolean",
    label: "Auto-include contexts",
    defaultValue: true,
    tooltip: "Automatically match and include relevant knowledge base documents."
  },
  {
    key: "investigateCodebase",
    type: "boolean",
    label: "Investigate codebase",
    defaultValue: true,
    tooltip: "Run an AI investigation step before generating the workflow. Analyzes project structure to produce a more targeted workflow. Adds ~30s to generation time."
  }
];
function getVisibleSettings(settings, features) {
  return settings.filter((def) => !def.visible || def.visible(features));
}
function getVisibleSections(sections, features) {
  return sections.map((section) => ({
    ...section,
    settings: getVisibleSettings(section.settings, features)
  })).filter((section) => section.settings.length > 0);
}
function getBooleanDisplayValue(def, storedValue) {
  const raw = storedValue === void 0 || storedValue === null ? def.defaultValue : Boolean(storedValue);
  return def.invertDisplay ? !raw : raw;
}
function toBooleanStoredValue(def, displayValue) {
  return def.invertDisplay ? !displayValue : displayValue;
}

// src/step-validation.ts
function getStepValidationIssues(step) {
  const issues = [];
  switch (step.type) {
    case "command": {
      if (!step.command && !step.test_type && !step.check_type && !step.check_group_id && !step.test_id) {
        issues.push({
          field: "command",
          message: "No command specified",
          severity: "error"
        });
      }
      if (step.test_type === "playwright" && !step.script_id && !step.code && !step.script_content) {
        issues.push({
          field: "script",
          message: "No test script",
          severity: "warning"
        });
      }
      break;
    }
    case "ui_bridge": {
      if (step.action === "navigate" && !step.url) {
        issues.push({
          field: "url",
          message: "URL required",
          severity: "error"
        });
      }
      if (step.action === "assert" && !step.target) {
        issues.push({
          field: "target",
          message: "Target element required",
          severity: "error"
        });
      }
      if (step.action === "execute" && !step.instruction) {
        issues.push({
          field: "instruction",
          message: "Instruction required",
          severity: "error"
        });
      }
      break;
    }
    case "prompt": {
      if (!step.content) {
        issues.push({
          field: "content",
          message: "Empty prompt",
          severity: "warning"
        });
      }
      break;
    }
  }
  return issues;
}
function needsConfig(step) {
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
      return false;
    // snapshot needs no config
    default:
      return false;
  }
}
function getStepSubtitle(step, maxLen = 60) {
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
        return step.command.length > maxLen ? step.command.substring(0, maxLen) + "..." : step.command;
      }
      return "Enter command...";
    }
    case "prompt": {
      if (step.content) {
        return step.content.length > maxLen ? step.content.substring(0, maxLen) + "..." : step.content;
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
      return step.workflow_name || "Select workflow...";
    }
    default:
      return "";
  }
}

// src/step-icons.ts
var STEP_ICON_DATA = {
  command: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400"
  },
  shell_command: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400"
  },
  shell: {
    iconId: "terminal",
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-400"
  },
  check: {
    iconId: "alert-triangle",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400"
  },
  check_group: {
    iconId: "check-circle",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400"
  },
  prompt: {
    iconId: "message-square",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400"
  },
  test: {
    iconId: "test-tube-2",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  ui_bridge: {
    iconId: "monitor",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400"
  },
  workflow: {
    iconId: "workflow",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400"
  }
};
var DEFAULT_ICON_DATA = {
  iconId: "activity",
  bgClass: "bg-zinc-500/10",
  textClass: "text-zinc-400"
};
var TEST_ICON_DATA = {
  playwright: {
    iconId: "test-tube-2",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  qontinui_vision: {
    iconId: "eye",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  python: {
    iconId: "code",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  repository: {
    iconId: "package",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  custom_command: {
    iconId: "terminal",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  }
};
function getStepIconData(stepType) {
  return STEP_ICON_DATA[stepType] ?? DEFAULT_ICON_DATA;
}
function getStepIconDataWithFallback(iconType, stepType) {
  if (iconType && STEP_ICON_DATA[iconType]) {
    return STEP_ICON_DATA[iconType];
  }
  return STEP_ICON_DATA[stepType] ?? DEFAULT_ICON_DATA;
}
function getTestIconData(testType) {
  return TEST_ICON_DATA[testType] ?? DEFAULT_ICON_DATA;
}

// src/chat-utils.ts
function parseOutputLog(outputLog) {
  const hasAiResponseBlocks = outputLog.includes("[AI_RESPONSE]");
  if (hasAiResponseBlocks) {
    return parseTaggedFormat(outputLog);
  }
  return parseLegacyFormat(outputLog);
}
function parseTaggedFormat(outputLog) {
  const messages = [];
  const blockRegex = /\[(USER_MESSAGE|AI_RESPONSE|CHAT_RESUMED|SYSTEM_NOTE)\]\n?([\s\S]*?)\n?\[\/(USER_MESSAGE|AI_RESPONSE|CHAT_RESUMED|SYSTEM_NOTE)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = blockRegex.exec(outputLog)) !== null) {
    const gap = outputLog.slice(lastIndex, match.index).replace(/\[SESSION_START:\d+\]/g, "").trim();
    if (gap) {
      messages.push({ role: "ai", content: gap });
    }
    const tag = match[1];
    const content = (match[2] ?? "").trim();
    lastIndex = match.index + match[0].length;
    if (!content) continue;
    if (tag === "USER_MESSAGE") {
      messages.push({ role: "user", content });
    } else if (tag === "AI_RESPONSE") {
      messages.push({ role: "ai", content });
    } else if (tag === "SYSTEM_NOTE") {
      messages.push({ role: "system", content });
    }
  }
  const trailing = outputLog.slice(lastIndex).replace(/\[SESSION_START:\d+\]/g, "").trim();
  if (trailing) {
    messages.push({ role: "ai", content: trailing });
  }
  return messages;
}
function parseLegacyFormat(outputLog) {
  const messages = [];
  const userMsgRegex = /\[USER_MESSAGE\]\n?([\s\S]*?)\n?\[\/USER_MESSAGE\]/g;
  let lastIndex = 0;
  let match;
  while ((match = userMsgRegex.exec(outputLog)) !== null) {
    const aiContent = outputLog.slice(lastIndex, match.index).replace(/\[SESSION_START:\d+\]/g, "").trim();
    if (aiContent) {
      messages.push({ role: "ai", content: aiContent });
    }
    const userContent = (match[1] ?? "").trim();
    if (userContent) {
      messages.push({ role: "user", content: userContent });
    }
    lastIndex = match.index + match[0].length;
  }
  const remaining = outputLog.slice(lastIndex).replace(/\[SESSION_START:\d+\]/g, "").trim();
  if (remaining) {
    messages.push({ role: "ai", content: remaining });
  }
  return messages;
}
function autoNameFromMessage(content, maxLength = 40) {
  const trimmed = content.trim().replace(/\n/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1) + "\u2026";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AI_SUMMARY_SETTING,
  CONTEXT_MANAGEMENT_SETTING,
  GENERATE_CLAUDE_MODELS,
  GENERATE_GEMINI_MODELS,
  GENERATE_PROVIDER_OPTIONS,
  GENERATE_SETTINGS_CONFIG,
  HEALTH_CHECK_SETTING,
  HEALTH_CHECK_URLS_SETTING,
  LOG_SOURCE_SETTING,
  LOG_WATCH_SETTING,
  MAX_ITERATIONS_SETTING,
  MODELS_BY_PROVIDER,
  MODEL_SETTING,
  PROMPT_TEMPLATE_SETTING,
  PROVIDER_OPTIONS,
  PROVIDER_SETTING,
  REFLECTION_MODE_SETTING,
  STEP_ICON_DATA,
  STOP_ON_FAILURE_SETTING,
  TEST_ICON_DATA,
  TIMEOUT_SETTING,
  WORKFLOW_SETTINGS_CONFIG,
  autoNameFromMessage,
  calculateCompressionSavings,
  canStepExistInPhase,
  createDefaultCompressionStatus,
  createDefaultExecutionStatus,
  createDefaultHookStatus,
  createDefaultRetryStatus,
  createDefaultRoutingStatus,
  createDefaultStep,
  createDefaultSubStepStatus,
  createDefaultWorkflow,
  createSummaryStep,
  describeConditions,
  describeCron,
  describeInterval,
  describeSchedule,
  describeTaskType,
  detectWorkflowFeatures,
  formatDuration,
  formatRelativeTime,
  formatTokenCount,
  generateStepId,
  getAccentColors,
  getActionColors,
  getBooleanDisplayValue,
  getComplexityDisplayName,
  getConditionStatusText,
  getGenerateModels,
  getHookTriggerDisplayName,
  getLogSourceValue,
  getPhaseCount,
  getSchedulerStatusColor,
  getSeverityColors,
  getStatusColors,
  getStepIconData,
  getStepIconDataWithFallback,
  getStepPhase,
  getStepSubtitle,
  getStepValidationIssues,
  getTestIconData,
  getTimeUntilNextRun,
  getTotalStepCount,
  getVisibleSections,
  getVisibleSettings,
  hasCompletedSuccessfully,
  hasConditions,
  isScheduledTaskRunning,
  isTaskComplete,
  isTaskFailed,
  isTaskFinished,
  isTaskRunning,
  isWaitingForConditions,
  isWorkflowEmpty,
  needsConfig,
  normalizeToPhases,
  parseLogSourceValue,
  parseOutputLog,
  toBooleanStoredValue
});
//# sourceMappingURL=index.cjs.map