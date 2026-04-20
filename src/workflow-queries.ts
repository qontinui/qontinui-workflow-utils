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
    ...workflow.setupSteps,
    ...workflow.verificationSteps,
    ...workflow.agenticSteps,
    ...(workflow.completionSteps ?? []),
    ...(workflow.stages ?? []).flatMap((s) => [
      ...s.setupSteps,
      ...s.verificationSteps,
      ...s.agenticSteps,
      ...(s.completionSteps ?? []),
    ]),
  ];

  const hasSetup =
    workflow.setupSteps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.setupSteps.length > 0);
  const hasVerification =
    workflow.verificationSteps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.verificationSteps.length > 0);
  const hasAgentic =
    workflow.agenticSteps.length > 0 ||
    (workflow.stages ?? []).some((s) => s.agenticSteps.length > 0);
  const hasCompletion =
    (workflow.completionSteps ?? []).length > 0 ||
    (workflow.stages ?? []).some(
      (s) => (s.completionSteps ?? []).length > 0,
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

  const completionSteps = workflow.completionSteps ?? [];
  const hasOnlySummaryStep =
    completionSteps.length === 0 ||
    (completionSteps.length === 1 &&
      completionSteps[0].type === "prompt" &&
      (completionSteps[0] as PromptStep).isSummaryStep === true);

  return (
    workflow.setupSteps.length === 0 &&
    workflow.verificationSteps.length === 0 &&
    workflow.agenticSteps.length === 0 &&
    hasOnlySummaryStep
  );
}

export function getTotalStepCount(workflow: UnifiedWorkflow): number {
  const topLevelCount =
    (workflow.setupSteps?.length ?? 0) +
    (workflow.verificationSteps?.length ?? 0) +
    (workflow.agenticSteps?.length ?? 0) +
    (workflow.completionSteps?.length ?? 0);

  const stagesCount = (workflow.stages ?? []).reduce(
    (sum, s) =>
      sum +
      (s.setupSteps?.length ?? 0) +
      (s.verificationSteps?.length ?? 0) +
      (s.agenticSteps?.length ?? 0) +
      (s.completionSteps?.length ?? 0),
    0,
  );

  return topLevelCount + stagesCount;
}

export function getStepPhase(step: UnifiedStep): WorkflowPhase {
  return (step as { phase: WorkflowPhase }).phase;
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
      setupSteps: workflow.setupSteps,
      verificationSteps: workflow.verificationSteps,
      agenticSteps: workflow.agenticSteps,
      completionSteps: workflow.completionSteps ?? [],
      maxIterations: workflow.maxIterations,
      timeoutSeconds: workflow.timeoutSeconds,
      provider: workflow.provider,
      model: workflow.model,
      approvalGate: false,
      completionPromptsFirst: false,
    },
  ];
}

export function getPhaseCount(workflow: UnifiedWorkflow): number {
  return normalizeToPhases(workflow).length;
}
