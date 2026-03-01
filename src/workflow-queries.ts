import type {
  UnifiedStep,
  UnifiedWorkflow,
  WorkflowPhase,
  WorkflowStage,
  PromptStep,
  WorkflowFeatures,
} from "@qontinui/shared-types/workflow";

export function detectWorkflowFeatures(
  workflow: UnifiedWorkflow,
): WorkflowFeatures {
  const allSteps: UnifiedStep[] = [
    ...workflow.setup_steps,
    ...workflow.verification_steps,
    ...workflow.agentic_steps,
    ...(workflow.completion_steps ?? []),
    ...(workflow.stages ?? []).flatMap((s) => [
      ...s.setup_steps,
      ...s.verification_steps,
      ...s.agentic_steps,
      ...(s.completion_steps ?? []),
    ]),
  ];

  const hasSetup =
    workflow.setup_steps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.setup_steps.length > 0);
  const hasVerification =
    workflow.verification_steps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.verification_steps.length > 0);
  const hasAgentic =
    workflow.agentic_steps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.agentic_steps.length > 0);
  const hasCompletion =
    (workflow.completion_steps ?? []).length > 0 ||
    (workflow.stages ?? []).some(
      (s) => (s.completion_steps ?? []).length > 0,
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
    hasAiPrompts,
  };
}

export function isWorkflowEmpty(workflow: UnifiedWorkflow): boolean {
  if ((workflow.stages ?? []).length > 0) return false;

  const completionSteps = workflow.completion_steps ?? [];
  const hasOnlySummaryStep =
    completionSteps.length === 0 ||
    (completionSteps.length === 1 &&
      completionSteps[0].type === "prompt" &&
      (completionSteps[0] as PromptStep).is_summary_step === true);

  return (
    workflow.setup_steps.length === 0 &&
    workflow.verification_steps.length === 0 &&
    workflow.agentic_steps.length === 0 &&
    hasOnlySummaryStep
  );
}

export function getTotalStepCount(workflow: UnifiedWorkflow): number {
  const topLevelCount =
    workflow.setup_steps.length +
    workflow.verification_steps.length +
    workflow.agentic_steps.length +
    (workflow.completion_steps ?? []).length;

  const stagesCount = (workflow.stages ?? []).reduce(
    (sum, s) =>
      sum +
      s.setup_steps.length +
      s.verification_steps.length +
      s.agentic_steps.length +
      (s.completion_steps ?? []).length,
    0,
  );

  return topLevelCount + stagesCount;
}

export function getStepPhase(step: UnifiedStep): WorkflowPhase {
  return step.phase;
}

export function canStepExistInPhase(
  stepType: UnifiedStep["type"],
  phase: WorkflowPhase,
): boolean {
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

export function normalizeToPhases(
  workflow: UnifiedWorkflow,
): WorkflowStage[] {
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
      model: workflow.model,
    },
  ];
}

export function getPhaseCount(workflow: UnifiedWorkflow): number {
  return normalizeToPhases(workflow).length;
}
