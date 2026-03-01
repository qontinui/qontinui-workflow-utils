import type {
  RoutingStatus,
  RetryStatus,
  CompressionStatus,
  HookStatus,
  SubStepStatusDisplay,
  ExecutionStatus,
} from "@qontinui/shared-types/execution";

export function createDefaultRoutingStatus(): RoutingStatus {
  return {
    enabled: false,
    decision: null,
    config: {
      simpleModel: "claude-3-5-haiku-20241022",
      mediumModel: "claude-sonnet-4-20250514",
      complexModel: "claude-opus-4-20250514",
    },
  };
}

export function createDefaultRetryStatus(): RetryStatus {
  return {
    enabled: true,
    maxRetries: 3,
    feedbackInjection: true,
    state: {
      attempt: 0,
      lastError: null,
      lastAttemptAt: null,
      totalDelayMs: 0,
      errorHistory: [],
    },
    nextRetryDelayMs: null,
    exhausted: false,
  };
}

export function createDefaultCompressionStatus(): CompressionStatus {
  return {
    enabled: true,
    thresholdTokens: 80000,
    targetTokens: 60000,
    currentTokenCount: null,
    lastCompression: null,
    thresholdPercentage: 0,
    compressionImminent: false,
  };
}

export function createDefaultHookStatus(): HookStatus {
  return {
    hooks: [],
    executionHistory: [],
    currentlyExecuting: null,
  };
}

export function createDefaultSubStepStatus(): SubStepStatusDisplay {
  return {
    current: null,
    steps: [],
    progressPercent: 0,
    completedCount: 0,
    totalCount: 0,
    isActive: false,
    currentPhase: null,
  };
}

export function createDefaultExecutionStatus(): ExecutionStatus {
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
    lastUpdated: Date.now(),
  };
}

export function getComplexityDisplayName(
  complexity: "simple" | "medium" | "complex",
): string {
  return { simple: "Simple", medium: "Medium", complex: "Complex" }[
    complexity
  ];
}

export function getHookTriggerDisplayName(trigger: string): string {
  const names: Record<string, string> = {
    pre_execution: "Pre-Execution",
    post_execution: "Post-Execution",
    on_error: "On Error",
    on_verification_fail: "On Verification Fail",
    on_complete: "On Complete",
    pre_iteration: "Pre-Iteration",
    post_iteration: "Post-Iteration",
  };
  return names[trigger] ?? trigger;
}

export function calculateCompressionSavings(result: {
  originalTokens: number;
  compressedTokens: number;
}): number {
  if (result.originalTokens === 0) return 0;
  return (
    ((result.originalTokens - result.compressedTokens) /
      result.originalTokens) *
    100
  );
}
