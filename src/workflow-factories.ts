import type {
  UnifiedStep,
  WorkflowPhase,
  PromptStep,
  UnifiedWorkflow,
  WorkflowStep,
} from "@qontinui/shared-types/workflow";
import { DEFAULT_SUMMARY_PROMPT } from "@qontinui/shared-types/workflow";

export function generateStepId(): string {
  return crypto.randomUUID();
}

export function createSummaryStep(): PromptStep {
  return {
    id: crypto.randomUUID(),
    type: "prompt",
    phase: "completion",
    name: "AI Summary",
    content: DEFAULT_SUMMARY_PROMPT,
    isSummaryStep: true,
  };
}

export function createDefaultStep(
  type: UnifiedStep["type"],
  phase: WorkflowPhase,
): UnifiedStep {
  const id = generateStepId();
  switch (type) {
    case "command":
      return {
        id,
        type: "command",
        phase: phase as "setup" | "verification" | "completion",
        name: "Command",
        mode: "shell",
        command: "",
      };
    case "ui_bridge":
      return {
        id,
        type: "ui_bridge",
        phase: phase as "setup" | "verification" | "completion",
        name: "UI Bridge",
        action: "snapshot",
      };
    case "prompt": {
      const promptNames: Record<WorkflowPhase, string> = {
        setup: "AI Setup Task",
        verification: "AI Verification",
        agentic: "Prompt",
        completion: "AI Completion Task",
      };
      return {
        id,
        type: "prompt",
        phase: phase as "setup" | "verification" | "agentic" | "completion",
        name: promptNames[phase] ?? "Prompt",
        content: "",
      };
    }
    case "workflow":
      return {
        id,
        type: "workflow",
        phase: phase as "setup" | "verification" | "completion",
        name: "Workflow",
        workflowId: "",
        workflowName: "",
      } as unknown as WorkflowStep as UnifiedStep;
    default:
      throw new Error(`Unknown step type: ${type}`);
  }
}

export function createDefaultWorkflow(
  includeSummaryStep: boolean = true,
): Pick<
  UnifiedWorkflow,
  | "name"
  | "description"
  | "setupSteps"
  | "verificationSteps"
  | "agenticSteps"
  | "completionSteps"
  | "category"
  | "tags"
> {
  return {
    name: "",
    description: "",
    setupSteps: [],
    verificationSteps: [],
    agenticSteps: [],
    completionSteps: includeSummaryStep ? [createSummaryStep()] : [],
    category: "general",
    tags: [],
  };
}
