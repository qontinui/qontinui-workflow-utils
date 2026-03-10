/**
 * State machine export/import format utilities.
 *
 * Converts between the internal StateMachineConfig types and the export
 * format compatible with UIBridgeRuntime.from_dict() in the qontinui library.
 */

import type {
  StateMachineConfig,
  StateMachineState,
  StateMachineTransition,
  StateMachineExportFormat,
} from "@qontinui/shared-types";

// =============================================================================
// Export
// =============================================================================

/**
 * Build the export format from config, states, and transitions.
 * The resulting object is compatible with UIBridgeRuntime.from_dict().
 */
export function buildExportConfig(
  config: StateMachineConfig,
  states: StateMachineState[],
  transitions: StateMachineTransition[],
): StateMachineExportFormat {
  const statesRecord: Record<string, Record<string, unknown>> = {};
  for (const state of states) {
    statesRecord[state.state_id] = {
      name: state.name,
      description: state.description ?? "",
      element_ids: state.element_ids,
      render_ids: state.render_ids,
      confidence: state.confidence,
      acceptance_criteria: state.acceptance_criteria,
      extra_metadata: state.extra_metadata,
    };
  }

  const transitionsRecord: Record<string, Record<string, unknown>> = {};
  for (const transition of transitions) {
    transitionsRecord[transition.transition_id] = {
      name: transition.name,
      from_states: transition.from_states,
      activate_states: transition.activate_states,
      exit_states: transition.exit_states,
      actions: transition.actions,
      path_cost: transition.path_cost,
      stays_visible: transition.stays_visible,
      extra_metadata: transition.extra_metadata,
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
      include_html_ids: config.include_html_ids,
    },
  };
}

// =============================================================================
// Download Helper
// =============================================================================

/**
 * Trigger a JSON file download in the browser.
 * This is a UI utility — call from components, not hooks.
 */
export function downloadAsJson(
  data: unknown,
  filename: string,
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
