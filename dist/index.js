// src/workflow-factories.ts
import { DEFAULT_SUMMARY_PROMPT } from "@qontinui/shared-types/workflow";
function generateStepId() {
  return crypto.randomUUID();
}
function createSummaryStep() {
  return {
    id: crypto.randomUUID(),
    type: "prompt",
    phase: "completion",
    name: "AI Summary",
    content: DEFAULT_SUMMARY_PROMPT,
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
  const topLevelCount = (workflow.setup_steps?.length ?? 0) + (workflow.verification_steps?.length ?? 0) + (workflow.agentic_steps?.length ?? 0) + (workflow.completion_steps?.length ?? 0);
  const stagesCount = (workflow.stages ?? []).reduce(
    (sum, s) => sum + (s.setup_steps?.length ?? 0) + (s.verification_steps?.length ?? 0) + (s.agentic_steps?.length ?? 0) + (s.completion_steps?.length ?? 0),
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
  rose: {
    bg: "bg-rose-500/10",
    bgSolid: "bg-rose-500",
    text: "text-rose-400",
    border: "border-rose-500/30"
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
      simpleModel: "claude-haiku-4-5-20251001",
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
var SMART_ROUTING_SENTINEL = "__smart__";
var MODELS_BY_PROVIDER = {
  claude_cli: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" }
  ],
  anthropic_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" }
  ],
  openai_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1-mini" }
  ],
  gemini_api: [
    { value: "", label: "Default" },
    { value: SMART_ROUTING_SENTINEL, label: "Smart (auto-route by complexity)" },
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
var APPROVAL_GATE_SETTING = {
  key: "approval_gate",
  type: "boolean",
  label: "Approval Gate",
  defaultValue: false,
  tooltip: "Pause for human review after each agentic phase before continuing to verification",
  visible: (f) => f.hasAiPrompts
};
var WORKFLOW_ARCHITECTURE_SETTING = {
  key: "workflow_architecture",
  type: "select",
  label: "Workflow Architecture",
  defaultValue: "traditional",
  options: [
    { value: "traditional", label: "Traditional (verify \u2192 fix loop)" },
    { value: "agentic_verification", label: "Agentic Verification (verifier \u2192 worker loop)" },
    { value: "multi_agent_pipeline", label: "Multi-Agent Pipeline (specialized agent DAG)" }
  ],
  description: "Execution architecture for the verification-agentic loop. Multi-Agent Pipeline uses specialized agents (analyst, locator, implementer, verifier) in a dependency-ordered DAG.",
  visible: (f) => f.hasAiPrompts
};
var PIPELINE_CONFIG_SETTING = {
  key: "multi_agent_pipeline_config",
  type: "custom",
  label: "Pipeline Agent Configuration",
  customType: "pipeline_config",
  visible: (f) => f.hasAiPrompts
};
var USE_WORKTREE_SETTING = {
  key: "use_worktree",
  type: "boolean",
  label: "Run in isolated worktree",
  defaultValue: false,
  tooltip: "Create a new git branch and worktree for this run. Changes stay isolated until merged."
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
var PER_PHASE_MODEL_SETTING = {
  key: "model_overrides",
  type: "custom",
  label: "Per-Phase Model Selection",
  customType: "per_phase_model_select",
  visible: (f) => f.hasAiPrompts
};
var RESOLVED_MODEL_PREVIEW_SETTING = {
  key: "resolved_model_preview",
  type: "custom",
  label: "Effective Model Preview",
  customType: "resolved_model_preview",
  visible: (f) => f.hasAiPrompts
};
var CONSTRAINT_OVERRIDES_SETTING = {
  key: "constraint_overrides",
  type: "custom",
  label: "Constraint Overrides",
  customType: "constraint_overrides"
};
var MODEL_OVERRIDE_PHASES = [
  { key: "setup", label: "Setup Phase" },
  { key: "agentic", label: "Agentic Phase" },
  { key: "completion", label: "Completion Phase" },
  { key: "verification", label: "Verification (generation review)" },
  { key: "investigation", label: "Investigation (pre-generation)" },
  { key: "summary", label: "Summary Generation" },
  { key: "generation", label: "Workflow Generation" }
];
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
      PER_PHASE_MODEL_SETTING,
      RESOLVED_MODEL_PREVIEW_SETTING,
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
      CONSTRAINT_OVERRIDES_SETTING,
      STOP_ON_FAILURE_SETTING,
      APPROVAL_GATE_SETTING,
      WORKFLOW_ARCHITECTURE_SETTING,
      PIPELINE_CONFIG_SETTING,
      USE_WORKTREE_SETTING
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
  },
  {
    key: "includeDesignGuidance",
    type: "boolean",
    label: "Include design guidance",
    defaultValue: false,
    tooltip: "Include frontend design quality guidance (typography, color, motion, spatial composition, anti-AI-slop rules) in generated workflows. Enable for design-focused frontend tasks."
  },
  {
    key: "generateSpecification",
    type: "boolean",
    label: "Generate specification",
    defaultValue: true,
    tooltip: "Run a specification agent before generating the workflow. Defines acceptance criteria that guide verification step generation. Produces more thorough verification at the cost of ~10-15s additional generation time."
  },
  {
    key: "verificationDepth",
    type: "select",
    label: "Verification depth",
    defaultValue: "standard",
    options: [
      { value: "smoke", label: "Smoke \u2014 minimal build/render checks" },
      { value: "standard", label: "Standard \u2014 spec-driven verification" },
      { value: "thorough", label: "Thorough \u2014 standard + anomaly detection" },
      { value: "regression", label: "Regression \u2014 standard + all known issues" }
    ],
    description: "Controls how many verification steps are generated. Higher levels include checks for known issues and exploratory anomaly detection."
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
var MODEL_PRESETS = [
  {
    id: "quality_first",
    name: "Quality First",
    description: "Opus for agentic, Sonnet elsewhere",
    overrides: {
      agentic: { model: "claude-opus-4-20250514" },
      setup: { model: "claude-sonnet-4-20250514" },
      completion: { model: "claude-sonnet-4-20250514" }
    }
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Sonnet everywhere",
    overrides: {
      setup: { model: "claude-sonnet-4-20250514" },
      agentic: { model: "claude-sonnet-4-20250514" },
      completion: { model: "claude-sonnet-4-20250514" }
    }
  },
  {
    id: "smart",
    name: "Smart Routing",
    description: "Auto-route by task complexity",
    overrides: {
      setup: { model: SMART_ROUTING_SENTINEL },
      agentic: { model: SMART_ROUTING_SENTINEL },
      completion: { model: SMART_ROUTING_SENTINEL }
    }
  }
];
function detectPreset(overrides) {
  if (!overrides) return "custom";
  for (const preset of MODEL_PRESETS) {
    const presetKeys = Object.keys(preset.overrides);
    const overrideKeys = Object.keys(overrides).filter(
      (k) => overrides[k]?.model
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
function resolveModelForPhase(phase, overrides, workflowModel, globalModel) {
  const phaseConfig = overrides?.[phase];
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
var SKILL_CATEGORY_ICON_DATA = {
  "code-quality": {
    iconId: "scan-search",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400"
  },
  testing: {
    iconId: "test-tube-2",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400"
  },
  monitoring: {
    iconId: "heart-pulse",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400"
  },
  "ai-task": {
    iconId: "bot",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400"
  },
  deployment: {
    iconId: "rocket",
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-400"
  },
  composition: {
    iconId: "workflow",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400"
  },
  custom: {
    iconId: "puzzle",
    bgClass: "bg-zinc-500/10",
    textClass: "text-zinc-400"
  }
};
var DEFAULT_CATEGORY_ICON_DATA = {
  iconId: "puzzle",
  bgClass: "bg-zinc-500/10",
  textClass: "text-zinc-400"
};
function getSkillCategoryIconData(category) {
  return SKILL_CATEGORY_ICON_DATA[category] ?? DEFAULT_CATEGORY_ICON_DATA;
}
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

// src/skills/builtin-skills.ts
var BUILTIN_SKILLS = [
  // =========================================================================
  // Code Quality
  // =========================================================================
  {
    id: "builtin:shell-command",
    name: "Shell Command",
    slug: "shell-command",
    description: "Run an arbitrary shell command",
    category: "code-quality",
    tags: ["shell", "command", "script"],
    icon: "terminal",
    color: "gray",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [
      {
        name: "command",
        type: "string",
        label: "Command",
        description: "Shell command to execute",
        required: true,
        placeholder: "npm run build"
      },
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Directory to run the command in",
        required: false,
        placeholder: "./frontend"
      },
      {
        name: "fail_on_error",
        type: "boolean",
        label: "Fail on Error",
        description: "Whether to fail the step if the command exits with a non-zero code",
        required: false,
        default: true
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "shell",
        command: "{{command}}",
        working_directory: "{{working_directory}}",
        fail_on_error: "{{fail_on_error}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:lint-project",
    name: "Lint Project",
    slug: "lint-project",
    description: "Run linting checks on the project",
    category: "code-quality",
    tags: ["lint", "eslint", "ruff", "code-quality"],
    icon: "scan-search",
    color: "cyan",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Project directory to lint",
        required: false,
        placeholder: "./frontend"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "lint",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:format-check",
    name: "Format Check",
    slug: "format-check",
    description: "Check code formatting (Prettier, Black, etc.)",
    category: "code-quality",
    tags: ["format", "prettier", "black", "code-quality"],
    icon: "align-left",
    color: "cyan",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Project directory to check formatting",
        required: false,
        placeholder: "./frontend"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "format",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:type-check",
    name: "Type Check",
    slug: "type-check",
    description: "Run type checking (TypeScript, mypy, etc.)",
    category: "code-quality",
    tags: ["typecheck", "typescript", "mypy", "types"],
    icon: "file-type",
    color: "cyan",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Project directory to type-check",
        required: false,
        placeholder: "./frontend"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "typecheck",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:run-check-group",
    name: "Run Check Group",
    slug: "run-check-group",
    description: "Execute a saved group of checks",
    category: "code-quality",
    tags: ["check-group", "checks", "quality"],
    icon: "check-circle",
    color: "cyan",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "check_group_id",
        type: "string",
        label: "Check Group",
        description: "ID of the check group to run",
        required: true,
        placeholder: "Select a check group"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check_group",
        check_group_id: "{{check_group_id}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:security-scan",
    name: "Security Scan",
    slug: "security-scan",
    description: "Run security vulnerability scanner",
    category: "code-quality",
    tags: ["security", "audit", "vulnerabilities"],
    icon: "shield-check",
    color: "red",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Project directory to scan",
        required: false,
        placeholder: "./"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "security",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // Testing
  // =========================================================================
  {
    id: "builtin:run-tests",
    name: "Run Tests",
    slug: "run-tests",
    description: "Execute a test suite (custom command, Python, etc.)",
    category: "testing",
    tags: ["test", "jest", "pytest", "vitest"],
    icon: "test-tube-2",
    color: "green",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "test_type",
        type: "select",
        label: "Test Type",
        description: "Type of test runner to use",
        required: true,
        default: "custom_command",
        options: [
          { label: "Custom Command", value: "custom_command" },
          { label: "Python (pytest)", value: "python" },
          { label: "Repository Tests", value: "repository" }
        ]
      },
      {
        name: "command",
        type: "string",
        label: "Test Command",
        description: "Command to run tests",
        required: false,
        placeholder: "npm test"
      },
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Directory to run tests in",
        required: false,
        placeholder: "./"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "test",
        test_type: "{{test_type}}",
        command: "{{command}}",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:playwright-test",
    name: "Playwright Test",
    slug: "playwright-test",
    description: "Run a Playwright browser test",
    category: "testing",
    tags: ["playwright", "browser", "e2e", "test"],
    icon: "test-tube-2",
    color: "green",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "code",
        type: "string",
        label: "Test Code",
        description: "Playwright test code to execute",
        required: true,
        placeholder: "await page.goto('http://localhost:3001');"
      },
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Project directory with Playwright config",
        required: false,
        placeholder: "./frontend"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "test",
        test_type: "playwright",
        code: "{{code}}",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // Deployment
  // =========================================================================
  {
    id: "builtin:ci-cd-status",
    name: "CI/CD Status Check",
    slug: "ci-cd-status",
    description: "Check the status of a CI/CD pipeline run",
    category: "deployment",
    tags: ["ci", "cd", "github-actions", "pipeline"],
    icon: "git-branch",
    color: "orange",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "repository",
        type: "string",
        label: "Repository",
        description: "GitHub repository (owner/repo)",
        required: true,
        placeholder: "owner/repo"
      },
      {
        name: "workflow_name",
        type: "string",
        label: "Workflow Name",
        description: "Name of the CI/CD workflow",
        required: false,
        placeholder: "CI"
      },
      {
        name: "branch",
        type: "string",
        label: "Branch",
        description: "Branch to check",
        required: false,
        default: "main",
        placeholder: "main"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "ci_cd",
        repository: "{{repository}}",
        workflow_name: "{{workflow_name}}",
        branch: "{{branch}}"
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // Monitoring
  // =========================================================================
  {
    id: "builtin:api-health-check",
    name: "API Health Check",
    slug: "api-health-check",
    description: "Check that an API endpoint returns the expected status",
    category: "monitoring",
    tags: ["health", "http", "api", "status"],
    icon: "heart-pulse",
    color: "rose",
    allowed_phases: ["setup", "verification"],
    parameters: [
      {
        name: "url",
        type: "string",
        label: "URL",
        description: "URL to check",
        required: true,
        placeholder: "http://localhost:8000/health"
      },
      {
        name: "expected_status",
        type: "number",
        label: "Expected Status",
        description: "Expected HTTP status code",
        required: false,
        default: 200
      },
      {
        name: "timeout",
        type: "number",
        label: "Timeout (seconds)",
        description: "Maximum wait time in seconds",
        required: false,
        default: 30
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "check",
        check_type: "http_status",
        check_url: "{{url}}",
        expected_status: "{{expected_status}}",
        timeout_seconds: "{{timeout}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:navigate-to-url",
    name: "Navigate to URL",
    slug: "navigate-to-url",
    description: "Navigate a browser to a URL via UI Bridge",
    category: "monitoring",
    tags: ["navigate", "browser", "url", "ui-bridge"],
    icon: "globe",
    color: "emerald",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [
      {
        name: "url",
        type: "string",
        label: "URL",
        description: "URL to navigate to",
        required: true,
        placeholder: "http://localhost:3001"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "ui_bridge",
        action: "navigate",
        url: "{{url}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:assert-element",
    name: "Assert Element",
    slug: "assert-element",
    description: "Assert that a UI element exists or matches expected state",
    category: "monitoring",
    tags: ["assert", "element", "verify", "ui-bridge"],
    icon: "check-square",
    color: "emerald",
    allowed_phases: ["verification"],
    parameters: [
      {
        name: "target",
        type: "string",
        label: "Target Selector",
        description: "CSS selector or element identifier",
        required: true,
        placeholder: "[data-testid='login-button']"
      },
      {
        name: "assert_type",
        type: "select",
        label: "Assertion Type",
        description: "Type of assertion to perform",
        required: true,
        default: "exists",
        options: [
          { label: "Exists", value: "exists" },
          { label: "Text Equals", value: "text_equals" },
          { label: "Contains Text", value: "contains" },
          { label: "Is Visible", value: "visible" },
          { label: "Is Enabled", value: "enabled" }
        ]
      },
      {
        name: "expected",
        type: "string",
        label: "Expected Value",
        description: "Expected text or value (for text_equals/contains)",
        required: false,
        placeholder: "Welcome"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "ui_bridge",
        action: "assert",
        target: "{{target}}",
        assert_type: "{{assert_type}}",
        expected: "{{expected}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:take-snapshot",
    name: "Take Snapshot",
    slug: "take-snapshot",
    description: "Capture a UI Bridge snapshot of the current page state",
    category: "monitoring",
    tags: ["snapshot", "capture", "ui-bridge", "state"],
    icon: "camera",
    color: "emerald",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [],
    template: {
      kind: "single_step",
      step: {
        type: "ui_bridge",
        action: "snapshot"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:ui-execute",
    name: "UI Execute",
    slug: "ui-execute",
    description: "Execute an instruction on the UI via UI Bridge",
    category: "monitoring",
    tags: ["execute", "interact", "ui-bridge"],
    icon: "pointer",
    color: "emerald",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [
      {
        name: "instruction",
        type: "string",
        label: "Instruction",
        description: "Natural language instruction to execute on the UI",
        required: true,
        placeholder: "Click the login button"
      },
      {
        name: "target",
        type: "string",
        label: "Target Selector",
        description: "Optional CSS selector or element identifier",
        required: false,
        placeholder: "[data-testid='submit']"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "ui_bridge",
        action: "execute",
        instruction: "{{instruction}}",
        target: "{{target}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:ui-compare",
    name: "Compare App State",
    slug: "ui-compare",
    description: "Compare current app state against a reference snapshot",
    category: "monitoring",
    tags: ["compare", "snapshot", "diff", "ui-bridge"],
    icon: "git-compare-arrows",
    color: "pink",
    allowed_phases: ["verification", "completion"],
    parameters: [
      {
        name: "comparison_mode",
        type: "select",
        label: "Comparison Mode",
        description: "How to compare the app state",
        required: true,
        default: "structural",
        options: [
          { label: "Structural", value: "structural" },
          { label: "Visual", value: "visual" },
          { label: "Both", value: "both" }
        ]
      },
      {
        name: "reference_snapshot_id",
        type: "string",
        label: "Reference Snapshot ID",
        description: "ID of the reference snapshot to compare against",
        required: false
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "ui_bridge",
        action: "compare",
        comparison_mode: "{{comparison_mode}}",
        reference_snapshot_id: "{{reference_snapshot_id}}"
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // AI Task
  // =========================================================================
  {
    id: "builtin:ai-task",
    name: "AI Task",
    slug: "ai-task",
    description: "Give the AI a task to complete",
    category: "ai-task",
    tags: ["ai", "prompt", "task", "agentic"],
    icon: "message-square",
    color: "amber",
    allowed_phases: ["setup", "verification", "agentic", "completion"],
    parameters: [
      {
        name: "content",
        type: "string",
        label: "Prompt",
        description: "Instructions for the AI to follow",
        required: true,
        placeholder: "Review the recent changes and suggest improvements..."
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "prompt",
        content: "{{content}}"
      }
    },
    source: "builtin"
  },
  {
    id: "builtin:ai-verification",
    name: "AI Verification",
    slug: "ai-verification",
    description: "AI-evaluated verification criteria",
    category: "ai-task",
    tags: ["ai", "verify", "review", "criteria"],
    icon: "bot",
    color: "violet",
    allowed_phases: ["verification"],
    parameters: [
      {
        name: "content",
        type: "string",
        label: "Verification Criteria",
        description: "Criteria for the AI to evaluate",
        required: true,
        placeholder: "Verify that the login page loads correctly..."
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "prompt",
        content: "{{content}}"
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // Composition
  // =========================================================================
  {
    id: "builtin:run-sub-workflow",
    name: "Run Sub-Workflow",
    slug: "run-sub-workflow",
    description: "Execute another saved workflow inline",
    category: "composition",
    tags: ["workflow", "sub-workflow", "compose", "reuse"],
    icon: "workflow",
    color: "blue",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [
      {
        name: "workflow_id",
        type: "string",
        label: "Workflow",
        description: "ID of the workflow to run",
        required: true,
        placeholder: "Select a workflow"
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "workflow",
        workflow_id: "{{workflow_id}}",
        workflow_name: ""
      }
    },
    source: "builtin"
  },
  // =========================================================================
  // Custom
  // =========================================================================
  {
    id: "builtin:state-exploration",
    name: "State Exploration",
    slug: "state-exploration",
    description: "Run a state exploration configuration",
    category: "custom",
    tags: ["exploration", "states", "testing"],
    icon: "compass",
    color: "emerald",
    allowed_phases: ["setup", "verification", "completion"],
    parameters: [
      {
        name: "command",
        type: "string",
        label: "Command",
        description: "Exploration command to execute",
        required: false,
        placeholder: "exploration command"
      },
      {
        name: "working_directory",
        type: "string",
        label: "Working Directory",
        description: "Directory to run the exploration in",
        required: false
      }
    ],
    template: {
      kind: "single_step",
      step: {
        type: "command",
        mode: "shell",
        command: "{{command}}",
        working_directory: "{{working_directory}}"
      }
    },
    source: "builtin"
  }
];

// src/skills/skill-registry.ts
var userSkills = [];
function registerUserSkills(skills) {
  userSkills = skills;
}
function clearUserSkills() {
  userSkills = [];
}
function getAllSkills() {
  return [...BUILTIN_SKILLS, ...userSkills];
}
function getSkill(id) {
  return BUILTIN_SKILLS.find((s) => s.id === id) ?? userSkills.find((s) => s.id === id);
}
function getSkillBySlug(slug) {
  return BUILTIN_SKILLS.find((s) => s.slug === slug) ?? userSkills.find((s) => s.slug === slug);
}
function getSkillsByPhase(phase) {
  return getAllSkills().filter((s) => s.allowed_phases.includes(phase));
}
function getSkillsByCategory(category) {
  return getAllSkills().filter((s) => s.category === category);
}
function getSkillCategories() {
  const categories = /* @__PURE__ */ new Set();
  for (const skill of getAllSkills()) {
    categories.add(skill.category);
  }
  return Array.from(categories);
}
function searchSkills(query, filters) {
  let results = getAllSkills();
  if (filters?.category) {
    results = results.filter((s) => s.category === filters.category);
  }
  if (filters?.phase) {
    results = results.filter((s) => s.allowed_phases.includes(filters.phase));
  }
  if (filters?.source) {
    results = results.filter((s) => s.source === filters.source);
  }
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter(
      (s) => filters.tags.some((tag) => s.tags.includes(tag))
    );
  }
  const trimmed = query.trim().toLowerCase();
  if (trimmed) {
    const words = trimmed.split(/\s+/);
    const scored = results.map((skill) => {
      const nameLower = skill.name.toLowerCase();
      const slugLower = skill.slug.toLowerCase();
      const descLower = skill.description.toLowerCase();
      const tagsLower = skill.tags.map((t) => t.toLowerCase());
      const haystack = [nameLower, descLower, slugLower, ...tagsLower].join(
        " "
      );
      if (!words.every((word) => haystack.includes(word))) {
        return null;
      }
      let score = 0;
      if (nameLower === trimmed) score += 100;
      if (slugLower === trimmed) score += 80;
      for (const word of words) {
        if (nameLower.includes(word)) score += 10;
        if (descLower.includes(word)) score += 5;
        for (const tag of tagsLower) {
          if (tag.includes(word)) score += 8;
        }
      }
      return { skill, score };
    }).filter(
      (x) => x !== null
    );
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.skill);
  }
  return results;
}

// src/skills/skill-instantiation.ts
function validateDependencies(skill) {
  if (!skill.depends_on || skill.depends_on.length === 0) return [];
  return skill.depends_on.filter((depId) => !getSkill(depId));
}
function resolveValue(value, params) {
  if (typeof value === "string") {
    const exactMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (exactMatch) {
      const paramName = exactMatch[1];
      return params[paramName];
    }
    if (value.includes("{{")) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
        const resolved = params[paramName];
        return resolved !== void 0 && resolved !== null ? String(resolved) : "";
      });
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, params));
  }
  if (value !== null && typeof value === "object") {
    return resolveObject(value, params);
  }
  return value;
}
function resolveObject(obj, params) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const resolved = resolveValue(value, params);
    if (resolved !== void 0) {
      result[key] = resolved;
    }
  }
  return result;
}
function buildEffectiveParams(skill, paramValues) {
  const effective = {};
  for (const param of skill.parameters) {
    const userValue = paramValues[param.name];
    if (userValue !== void 0 && userValue !== null && userValue !== "") {
      effective[param.name] = userValue;
    } else if (param.default !== void 0) {
      effective[param.name] = param.default;
    }
  }
  return effective;
}
function instantiateSkill(skill, phase, paramValues) {
  if (!skill.allowed_phases.includes(phase)) {
    throw new Error(
      `Skill "${skill.name}" is not allowed in phase "${phase}". Allowed phases: ${skill.allowed_phases.join(", ")}`
    );
  }
  const missingDeps = validateDependencies(skill);
  if (missingDeps.length > 0) {
    throw new Error(
      `Skill "${skill.name}" has missing dependencies: ${missingDeps.join(", ")}`
    );
  }
  const effectiveParams = buildEffectiveParams(skill, paramValues);
  for (const param of skill.parameters) {
    const val = effectiveParams[param.name];
    if (val === void 0) continue;
    if (param.min !== void 0 && typeof val === "number" && val < param.min) {
      throw new Error(
        `Parameter "${param.name}" value ${val} is below minimum ${param.min}`
      );
    }
    if (param.max !== void 0 && typeof val === "number" && val > param.max) {
      throw new Error(
        `Parameter "${param.name}" value ${val} exceeds maximum ${param.max}`
      );
    }
    if (param.pattern !== void 0 && typeof val === "string") {
      const re = new RegExp(param.pattern);
      if (!re.test(val)) {
        throw new Error(
          `Parameter "${param.name}" value "${val}" does not match pattern "${param.pattern}"`
        );
      }
    }
  }
  const origin = {
    skill_id: skill.id,
    skill_slug: skill.slug,
    parameter_values: effectiveParams
  };
  if (skill.template.kind === "composition") {
    throw new Error(
      `Skill "${skill.name}" is a composition skill and cannot be directly instantiated`
    );
  }
  const templateSteps = skill.template.kind === "single_step" ? [skill.template.step] : skill.template.steps;
  return templateSteps.map((templateStep, index) => {
    const resolved = resolveObject(templateStep, effectiveParams);
    const id = crypto.randomUUID();
    const name = templateSteps.length > 1 ? `${skill.name} (${index + 1}/${templateSteps.length})` : skill.name;
    return {
      id,
      name,
      phase,
      skill_origin: origin,
      ...resolved
    };
  });
}
function instantiateComposition(skill, phase, paramValues) {
  if (skill.template.kind !== "composition") {
    throw new Error(`Skill "${skill.name}" is not a composition skill`);
  }
  const allSteps = [];
  for (const ref of skill.template.skill_refs) {
    const refSkill = getSkill(ref.skill_id);
    if (!refSkill) {
      throw new Error(`Referenced skill not found: ${ref.skill_id}`);
    }
    const mergedParams = { ...paramValues, ...ref.parameter_overrides };
    const steps = instantiateSkill(refSkill, phase, mergedParams);
    allSteps.push(...steps);
  }
  return allSteps;
}
function validateSkillParams(skill, paramValues) {
  const errors = [];
  for (const param of skill.parameters) {
    if (param.required) {
      const value = paramValues[param.name];
      if (value === void 0 || value === null || value === "") {
        errors.push(`"${param.label}" is required`);
      }
    }
  }
  return errors;
}

// src/skills/skill-checksum.ts
async function computeSkillChecksum(skill) {
  const content = [
    skill.name,
    skill.slug,
    skill.description,
    skill.category,
    ...skill.tags,
    JSON.stringify(skill.template),
    JSON.stringify(skill.parameters),
    skill.version ?? ""
  ].join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function computeExportChecksum(skills) {
  const individualChecksums = await Promise.all(
    skills.map(computeSkillChecksum)
  );
  const combined = individualChecksums.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// src/skills/skill-versioning.ts
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}
function bumpVersion(version, type) {
  const parsed = parseVersion(version);
  if (!parsed) return "1.0.0";
  switch (type) {
    case "major":
      return `${parsed.major + 1}.0.0`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
}
function compareVersions(a, b) {
  const pa = parseVersion(a) ?? { major: 0, minor: 0, patch: 0 };
  const pb = parseVersion(b) ?? { major: 0, minor: 0, patch: 0 };
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}
function hasUpdate(localSkill, remoteSkill) {
  if (localSkill.version && remoteSkill.version) {
    if (compareVersions(remoteSkill.version, localSkill.version) > 0) {
      return true;
    }
  }
  if (localSkill.checksum && remoteSkill.checksum) {
    return localSkill.checksum !== remoteSkill.checksum;
  }
  return false;
}

// src/state-machine/graph-layout.ts
var DEFAULT_LAYOUT_OPTIONS = {
  direction: "TB",
  nodeWidth: 200,
  nodeHeight: 150,
  nodeSep: 50,
  rankSep: 100
};
var STATE_MACHINE_LAYOUT_OPTIONS = {
  direction: "TB",
  nodeWidth: 260,
  nodeHeight: 120,
  nodeSep: 70,
  rankSep: 130
};
function getNodeSizeTier(elementCount) {
  if (elementCount <= 4) return { width: 200, gridCols: 3 };
  if (elementCount <= 10) return { width: 260, gridCols: 4 };
  if (elementCount <= 18) return { width: 320, gridCols: 5 };
  return { width: 380, gridCols: 6 };
}
var ELEMENT_TYPE_STYLES = {
  testid: {
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/30"
  },
  role: {
    bg: "bg-green-500/20",
    text: "text-green-300",
    border: "border-green-500/30"
  },
  text: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/30"
  },
  ui: {
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    border: "border-purple-500/30"
  },
  url: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-300",
    border: "border-cyan-500/30"
  },
  nav: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-300",
    border: "border-cyan-500/30"
  }
};
var DEFAULT_ELEMENT_TYPE_STYLE = {
  bg: "bg-gray-500/20",
  text: "text-gray-300",
  border: "border-gray-500/30"
};
function getElementTypeStyle(elementId) {
  const prefix = elementId.split(":")[0];
  return ELEMENT_TYPE_STYLES[prefix] ?? DEFAULT_ELEMENT_TYPE_STYLE;
}
function getElementTypePrefix(elementId) {
  return elementId.split(":")[0];
}
var ACTION_TYPE_COLORS = {
  click: "text-blue-400",
  doubleClick: "text-blue-400",
  rightClick: "text-blue-400",
  type: "text-amber-400",
  select: "text-purple-400",
  wait: "text-gray-400",
  navigate: "text-cyan-400"
};
var DEFAULT_ACTION_TYPE_COLOR = "text-gray-400";
function getActionTypeColor(actionType) {
  return ACTION_TYPE_COLORS[actionType] ?? DEFAULT_ACTION_TYPE_COLOR;
}
function getConfidenceColor(confidence) {
  if (confidence < 0.5) return "text-red-400";
  if (confidence < 0.8) return "text-yellow-400";
  return "text-green-400";
}
function getLayoutedElements(dagreLib, nodes, edges, options = {}) {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const dagreGraph = new dagreLib.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep
  });
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight
    });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  dagreLib.layout(dagreGraph);
  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: Math.round(pos.x - opts.nodeWidth / 2),
        y: Math.round(pos.y - opts.nodeHeight / 2)
      }
    };
  });
  return { nodes: layoutedNodes, edges };
}
function getGridLayoutedElements(nodes, edges, columns = 4, nodeWidth = 200, nodeHeight = 150, spacingX = 50, spacingY = 50) {
  const layoutedNodes = nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...node,
      position: {
        x: Math.round(col * (nodeWidth + spacingX) + 100),
        y: Math.round(row * (nodeHeight + spacingY) + 100)
      }
    };
  });
  return { nodes: layoutedNodes, edges };
}
function getElementLabel(elementId) {
  const idx = elementId.indexOf(":");
  return idx > 0 ? elementId.slice(idx + 1) : elementId;
}
var ACTION_LABELS = {
  click: "Click",
  type: "Type",
  select: "Select",
  wait: "Wait",
  navigate: "Navigate"
};
var ACTION_ACTIVE_LABELS = {
  click: "Clicking...",
  type: "Typing...",
  select: "Selecting...",
  wait: "Waiting...",
  navigate: "Navigating..."
};
var ACTION_COLOR_CONFIG = {
  click: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30"
  },
  type: {
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30"
  },
  select: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30"
  },
  wait: {
    text: "text-gray-400",
    bg: "bg-gray-500/15",
    border: "border-gray-500/30"
  },
  navigate: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30"
  }
};
var DEFAULT_ACTION_COLOR_CONFIG = {
  text: "text-gray-400",
  bg: "bg-gray-500/15",
  border: "border-gray-500/30"
};
function getActionColorConfig(actionType) {
  return ACTION_COLOR_CONFIG[actionType] ?? DEFAULT_ACTION_COLOR_CONFIG;
}
function computeActionDuration(action) {
  switch (action.type) {
    case "click":
      return 800;
    case "type":
      return Math.max(800, (action.text?.length ?? 5) * 60 + 400);
    case "navigate":
      return 1200;
    case "wait":
      return Math.min(action.delay_ms ?? 1e3, 2e3);
    case "select":
      return 1e3;
    default:
      return 1500;
  }
}
var STATE_COLORS = [
  {
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    bgSolid: "rgba(59, 130, 246, 0.25)"
  },
  {
    border: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
    bgSolid: "rgba(34, 197, 94, 0.25)"
  },
  {
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    bgSolid: "rgba(245, 158, 11, 0.25)"
  },
  {
    border: "#ec4899",
    bg: "rgba(236, 72, 153, 0.12)",
    bgSolid: "rgba(236, 72, 153, 0.25)"
  },
  {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    bgSolid: "rgba(139, 92, 246, 0.25)"
  },
  {
    border: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    bgSolid: "rgba(239, 68, 68, 0.25)"
  },
  {
    border: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.12)",
    bgSolid: "rgba(6, 182, 212, 0.25)"
  },
  {
    border: "#84cc16",
    bg: "rgba(132, 204, 22, 0.12)",
    bgSolid: "rgba(132, 204, 22, 0.25)"
  }
];
function computeSpatialLayout(states, transitions, canvasWidth, canvasHeight) {
  const positions = /* @__PURE__ */ new Map();
  if (states.length === 0) return positions;
  const overlapMatrix = /* @__PURE__ */ new Map();
  for (const s1 of states) {
    const map = /* @__PURE__ */ new Map();
    for (const s2 of states) {
      if (s1.state_id === s2.state_id) continue;
      const s2Set = new Set(s2.element_ids);
      const intersection = s1.element_ids.filter(
        (eid) => s2Set.has(eid)
      ).length;
      const union = (/* @__PURE__ */ new Set([...s1.element_ids, ...s2.element_ids])).size;
      map.set(s2.state_id, union > 0 ? intersection / union : 0);
    }
    overlapMatrix.set(s1.state_id, map);
  }
  const connectionStrength = /* @__PURE__ */ new Map();
  for (const t of transitions) {
    for (const from of t.from_states) {
      for (const to of t.activate_states) {
        if (!connectionStrength.has(from))
          connectionStrength.set(from, /* @__PURE__ */ new Map());
        const current = connectionStrength.get(from).get(to) ?? 0;
        connectionStrength.get(from).set(to, current + 1);
        if (!connectionStrength.has(to))
          connectionStrength.set(to, /* @__PURE__ */ new Map());
        connectionStrength.get(to).set(from, (connectionStrength.get(to).get(from) ?? 0) + 1);
      }
    }
  }
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.35;
  states.forEach((state, i) => {
    const angle = i / states.length * Math.PI * 2 - Math.PI / 2;
    const radius = Math.max(
      20,
      Math.min(50, 15 + state.element_ids.length * 2)
    );
    positions.set(state.state_id, {
      x: cx + Math.cos(angle) * baseRadius,
      y: cy + Math.sin(angle) * baseRadius,
      radius
    });
  });
  const iterations = 80;
  const repulsionStrength = 3e3;
  const attractionStrength = 0.02;
  for (let iter = 0; iter < iterations; iter++) {
    const forces = /* @__PURE__ */ new Map();
    for (const s of states) {
      forces.set(s.state_id, { fx: 0, fy: 0 });
    }
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const s1 = states[i];
        const s2 = states[j];
        const p1 = positions.get(s1.state_id);
        const p2 = positions.get(s2.state_id);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsionStrength / (dist * dist);
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        forces.get(s1.state_id).fx -= fx;
        forces.get(s1.state_id).fy -= fy;
        forces.get(s2.state_id).fx += fx;
        forces.get(s2.state_id).fy += fy;
      }
    }
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const s1 = states[i];
        const s2 = states[j];
        const overlap = overlapMatrix.get(s1.state_id)?.get(s2.state_id) ?? 0;
        const connection = (connectionStrength.get(s1.state_id)?.get(s2.state_id) ?? 0) * 0.3;
        const attraction = (overlap + connection) * attractionStrength;
        if (attraction > 0) {
          const p1 = positions.get(s1.state_id);
          const p2 = positions.get(s2.state_id);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          forces.get(s1.state_id).fx += dx * attraction;
          forces.get(s1.state_id).fy += dy * attraction;
          forces.get(s2.state_id).fx -= dx * attraction;
          forces.get(s2.state_id).fy -= dy * attraction;
        }
      }
    }
    for (const s of states) {
      const p = positions.get(s.state_id);
      const f = forces.get(s.state_id);
      f.fx += (cx - p.x) * 5e-3;
      f.fy += (cy - p.y) * 5e-3;
    }
    const cooling = 1 - iter / iterations;
    const maxMove = 20 * cooling;
    for (const s of states) {
      const p = positions.get(s.state_id);
      const f = forces.get(s.state_id);
      const mag = Math.sqrt(f.fx * f.fx + f.fy * f.fy);
      const scale = mag > maxMove ? maxMove / mag : 1;
      p.x = Math.max(
        p.radius + 10,
        Math.min(canvasWidth - p.radius - 10, p.x + f.fx * scale)
      );
      p.y = Math.max(
        p.radius + 30,
        Math.min(canvasHeight - p.radius - 10, p.y + f.fy * scale)
      );
    }
  }
  return positions;
}

// src/state-machine/pathfinding.ts
function buildAdjacencyList(transitions) {
  const adj = /* @__PURE__ */ new Map();
  for (const t of transitions) {
    for (const fromState of t.from_states) {
      const entries = adj.get(fromState) ?? [];
      entries.push({
        transition: t,
        targetStates: t.activate_states
      });
      adj.set(fromState, entries);
    }
  }
  return adj;
}
function findPathBFS(transitions, request) {
  if (request.from_states.length === 0 || request.target_states.length === 0) {
    return { found: false, steps: [], total_cost: 0, error: "Empty state set" };
  }
  const targetSet = new Set(request.target_states);
  if (request.from_states.some((s) => targetSet.has(s))) {
    return { found: true, steps: [], total_cost: 0 };
  }
  const adj = buildAdjacencyList(transitions);
  const visited = /* @__PURE__ */ new Set();
  const queue = [];
  for (const startState of request.from_states) {
    visited.add(startState);
    queue.push({ stateId: startState, path: [] });
  }
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = adj.get(current.stateId) ?? [];
    for (const entry of entries) {
      const step = {
        transition_id: entry.transition.transition_id,
        transition_name: entry.transition.name,
        from_states: entry.transition.from_states,
        activate_states: entry.transition.activate_states,
        exit_states: entry.transition.exit_states,
        path_cost: entry.transition.path_cost
      };
      const newPath = [...current.path, step];
      for (const target of entry.targetStates) {
        if (targetSet.has(target)) {
          const totalCost = newPath.reduce((sum, s) => sum + s.path_cost, 0);
          return { found: true, steps: newPath, total_cost: totalCost };
        }
        if (!visited.has(target)) {
          visited.add(target);
          queue.push({ stateId: target, path: newPath });
        }
      }
    }
  }
  return {
    found: false,
    steps: [],
    total_cost: 0,
    error: "No path found between the specified states"
  };
}
function findPathDijkstra(transitions, request) {
  if (request.from_states.length === 0 || request.target_states.length === 0) {
    return { found: false, steps: [], total_cost: 0, error: "Empty state set" };
  }
  const targetSet = new Set(request.target_states);
  if (request.from_states.some((s) => targetSet.has(s))) {
    return { found: true, steps: [], total_cost: 0 };
  }
  const adj = buildAdjacencyList(transitions);
  const bestCost = /* @__PURE__ */ new Map();
  const pq = [];
  for (const startState of request.from_states) {
    bestCost.set(startState, 0);
    pq.push({ stateId: startState, cost: 0, path: [] });
  }
  while (pq.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].cost < pq[minIdx].cost) minIdx = i;
    }
    const current = pq.splice(minIdx, 1)[0];
    const known = bestCost.get(current.stateId);
    if (known !== void 0 && current.cost > known) continue;
    if (targetSet.has(current.stateId)) {
      return { found: true, steps: current.path, total_cost: current.cost };
    }
    const entries = adj.get(current.stateId) ?? [];
    for (const entry of entries) {
      const step = {
        transition_id: entry.transition.transition_id,
        transition_name: entry.transition.name,
        from_states: entry.transition.from_states,
        activate_states: entry.transition.activate_states,
        exit_states: entry.transition.exit_states,
        path_cost: entry.transition.path_cost
      };
      const newCost = current.cost + entry.transition.path_cost;
      const newPath = [...current.path, step];
      for (const target of entry.targetStates) {
        const prevCost = bestCost.get(target);
        if (prevCost === void 0 || newCost < prevCost) {
          bestCost.set(target, newCost);
          pq.push({ stateId: target, cost: newCost, path: newPath });
        }
      }
    }
  }
  return {
    found: false,
    steps: [],
    total_cost: 0,
    error: "No path found between the specified states"
  };
}
function findPath(transitions, request, algorithm = "dijkstra") {
  if (algorithm === "bfs") {
    return findPathBFS(transitions, request);
  }
  return findPathDijkstra(transitions, request);
}

// src/state-machine/validation.ts
function deriveAction(elementId) {
  if (elementId.startsWith("url:") || elementId.startsWith("nav:")) {
    const label2 = elementId.includes(":") ? elementId.split(":").slice(1).join(":") : elementId;
    return {
      name: `Navigate to ${label2}`,
      action: { type: "navigate", url: label2 }
    };
  }
  if (elementId.startsWith("text:")) {
    const label2 = elementId.includes(":") ? elementId.split(":").slice(1).join(":") : elementId;
    return {
      name: `Type in ${label2}`,
      action: { type: "type", target: elementId, text: "" }
    };
  }
  if (elementId.startsWith("role:")) {
    const roleLabel = elementId.slice(5).toLowerCase();
    if (/select|option|listbox|combobox|dropdown/i.test(roleLabel)) {
      const label2 = elementId.split(":").slice(1).join(":");
      return {
        name: `Select ${label2}`,
        action: { type: "select", target: elementId }
      };
    }
  }
  const label = elementId.includes(":") ? elementId.split(":").slice(1).join(":") : elementId;
  return {
    name: `Click ${label}`,
    action: { type: "click", target: elementId }
  };
}
function findExistingTransition(transitions, sourceStateId, targetStateId) {
  return transitions.find(
    (t) => t.from_states.includes(sourceStateId) && t.activate_states.includes(targetStateId)
  );
}
function buildTransitionFromDrag(sourceStateId, targetStateId, elementId) {
  const { name, action } = deriveAction(elementId);
  const exitStates = sourceStateId !== targetStateId ? [sourceStateId] : [];
  return {
    name,
    from_states: [sourceStateId],
    activate_states: [targetStateId],
    exit_states: exitStates,
    actions: [action],
    path_cost: 1,
    stays_visible: false
  };
}
function validateState(state) {
  const errors = [];
  if (!state.name?.trim()) {
    errors.push({ field: "name", message: "State name is required" });
  }
  if (!state.element_ids || state.element_ids.length === 0) {
    errors.push({
      field: "element_ids",
      message: "State must have at least one element"
    });
  }
  return errors;
}
function validateTransition(transition) {
  const errors = [];
  if (!transition.name?.trim()) {
    errors.push({ field: "name", message: "Transition name is required" });
  }
  if (!transition.from_states || transition.from_states.length === 0) {
    errors.push({
      field: "from_states",
      message: "Transition must have at least one source state"
    });
  }
  if (!transition.activate_states || transition.activate_states.length === 0) {
    errors.push({
      field: "activate_states",
      message: "Transition must activate at least one state"
    });
  }
  if (!transition.actions || transition.actions.length === 0) {
    errors.push({
      field: "actions",
      message: "Transition must have at least one action"
    });
  }
  return errors;
}
function isSelfLoop(fromStates, activateStates) {
  return fromStates.some((s) => activateStates.includes(s));
}
function countElementsByType(states) {
  const counts = {};
  for (const state of states) {
    for (const elementId of state.element_ids) {
      const prefix = elementId.split(":")[0];
      counts[prefix] = (counts[prefix] ?? 0) + 1;
    }
  }
  return counts;
}
function findStatesWithElement(states, elementId) {
  return states.filter((s) => s.element_ids.includes(elementId));
}
function getAllElementIds(states) {
  const ids = /* @__PURE__ */ new Set();
  for (const state of states) {
    for (const elementId of state.element_ids) {
      ids.add(elementId);
    }
  }
  return Array.from(ids);
}

// src/state-machine/export.ts
function buildExportConfig(config, states, transitions) {
  const statesRecord = {};
  for (const state of states) {
    statesRecord[state.state_id] = {
      name: state.name,
      description: state.description ?? "",
      element_ids: state.element_ids,
      render_ids: state.render_ids,
      confidence: state.confidence,
      acceptance_criteria: state.acceptance_criteria,
      extra_metadata: state.extra_metadata
    };
  }
  const transitionsRecord = {};
  for (const transition of transitions) {
    transitionsRecord[transition.transition_id] = {
      name: transition.name,
      from_states: transition.from_states,
      activate_states: transition.activate_states,
      exit_states: transition.exit_states,
      actions: transition.actions,
      path_cost: transition.path_cost,
      stays_visible: transition.stays_visible,
      extra_metadata: transition.extra_metadata
    };
  }
  return {
    states: statesRecord,
    transitions: transitionsRecord,
    config: {
      name: config.name,
      description: config.description ?? "",
      render_count: config.render_count,
      element_count: config.element_count,
      include_html_ids: config.include_html_ids
    }
  };
}

// src/constraint-utils.ts
var BUILTIN_CONSTRAINT_IDS = [
  "builtin:no-secrets",
  "builtin:no-debug-statements",
  "builtin:no-env-files"
];
function isBuiltinConstraint(id) {
  return id.startsWith("builtin:");
}
function isCustomConstraint(id) {
  return id.startsWith("project:");
}
function isAiConstraint(id) {
  return id.startsWith("ai:");
}
function constraintCheckTypeLabel(type) {
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
function severityLabel(severity) {
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
function severityColor(severity) {
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
function severityBadgeColor(severity) {
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
function generateConstraintId(name) {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `project:${slug}`;
}
var DEFAULT_COMMAND_TIMEOUT_SECS = 30;
var DEFAULT_WARNING_THRESHOLD = 0.75;

// src/constraint-toml.ts
function tomlString(value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
function tomlStringArray(values) {
  return `[${values.map(tomlString).join(", ")}]`;
}
function generateConstraintToml(constraints, resourceLimits) {
  const lines = [];
  const builtins = constraints.filter((c) => isBuiltinConstraint(c.id));
  if (builtins.length > 0) {
    lines.push("[builtins]");
    for (const b of builtins) {
      const suffix = b.id.replace(/^builtin:/, "");
      lines.push(`${suffix} = ${b.enabled}`);
    }
    lines.push("");
  }
  const hasResources = resourceLimits.max_wall_time_secs != null || resourceLimits.max_files_modified != null || resourceLimits.max_agentic_time_ms != null || resourceLimits.warning_threshold != null;
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
    lines.push("[constraint.check]");
    appendCheckToml(lines, c.check);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
function appendCheckToml(lines, check) {
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
export {
  ACTION_ACTIVE_LABELS,
  ACTION_COLOR_CONFIG,
  ACTION_LABELS,
  ACTION_TYPE_COLORS,
  AI_SUMMARY_SETTING,
  APPROVAL_GATE_SETTING,
  BUILTIN_CONSTRAINT_IDS,
  BUILTIN_SKILLS,
  CONSTRAINT_OVERRIDES_SETTING,
  CONTEXT_MANAGEMENT_SETTING,
  DEFAULT_ACTION_COLOR_CONFIG,
  DEFAULT_ACTION_TYPE_COLOR,
  DEFAULT_COMMAND_TIMEOUT_SECS,
  DEFAULT_ELEMENT_TYPE_STYLE,
  DEFAULT_LAYOUT_OPTIONS,
  DEFAULT_WARNING_THRESHOLD,
  ELEMENT_TYPE_STYLES,
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
  MODEL_OVERRIDE_PHASES,
  MODEL_PRESETS,
  MODEL_SETTING,
  PER_PHASE_MODEL_SETTING,
  PIPELINE_CONFIG_SETTING,
  PROMPT_TEMPLATE_SETTING,
  PROVIDER_OPTIONS,
  PROVIDER_SETTING,
  REFLECTION_MODE_SETTING,
  RESOLVED_MODEL_PREVIEW_SETTING,
  SKILL_CATEGORY_ICON_DATA,
  SMART_ROUTING_SENTINEL,
  STATE_COLORS,
  STATE_MACHINE_LAYOUT_OPTIONS,
  STEP_ICON_DATA,
  STOP_ON_FAILURE_SETTING,
  TEST_ICON_DATA,
  TIMEOUT_SETTING,
  USE_WORKTREE_SETTING,
  WORKFLOW_ARCHITECTURE_SETTING,
  WORKFLOW_SETTINGS_CONFIG,
  autoNameFromMessage,
  buildExportConfig,
  buildTransitionFromDrag,
  bumpVersion,
  calculateCompressionSavings,
  canStepExistInPhase,
  clearUserSkills,
  compareVersions,
  computeActionDuration,
  computeExportChecksum,
  computeSkillChecksum,
  computeSpatialLayout,
  constraintCheckTypeLabel,
  countElementsByType,
  createDefaultCompressionStatus,
  createDefaultExecutionStatus,
  createDefaultHookStatus,
  createDefaultRetryStatus,
  createDefaultRoutingStatus,
  createDefaultStep,
  createDefaultSubStepStatus,
  createDefaultWorkflow,
  createSummaryStep,
  deriveAction,
  describeConditions,
  describeCron,
  describeInterval,
  describeSchedule,
  describeTaskType,
  detectPreset,
  detectWorkflowFeatures,
  findExistingTransition,
  findPath,
  findPathBFS,
  findPathDijkstra,
  findStatesWithElement,
  formatDuration,
  formatRelativeTime,
  formatTokenCount,
  generateConstraintId,
  generateConstraintToml,
  generateStepId,
  getAccentColors,
  getActionColorConfig,
  getActionColors,
  getActionTypeColor,
  getAllElementIds,
  getAllSkills,
  getBooleanDisplayValue,
  getComplexityDisplayName,
  getConditionStatusText,
  getConfidenceColor,
  getElementLabel,
  getElementTypePrefix,
  getElementTypeStyle,
  getGenerateModels,
  getGridLayoutedElements,
  getHookTriggerDisplayName,
  getLayoutedElements,
  getLogSourceValue,
  getNodeSizeTier,
  getPhaseCount,
  getSchedulerStatusColor,
  getSeverityColors,
  getSkill,
  getSkillBySlug,
  getSkillCategories,
  getSkillCategoryIconData,
  getSkillsByCategory,
  getSkillsByPhase,
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
  hasUpdate,
  instantiateComposition,
  instantiateSkill,
  isAiConstraint,
  isBuiltinConstraint,
  isCustomConstraint,
  isScheduledTaskRunning,
  isSelfLoop,
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
  parseVersion,
  registerUserSkills,
  resolveModelForPhase,
  searchSkills,
  severityBadgeColor,
  severityColor,
  severityLabel,
  toBooleanStoredValue,
  tomlString,
  tomlStringArray,
  validateDependencies,
  validateSkillParams,
  validateState,
  validateTransition
};
//# sourceMappingURL=index.js.map