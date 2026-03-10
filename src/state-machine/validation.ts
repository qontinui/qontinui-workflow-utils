/**
 * State machine validation and derivation utilities.
 *
 * Pure functions for validating state machine data and deriving
 * transition actions from element IDs.
 */

import type {
  TransitionAction,
  StateMachineState,
  StateMachineTransition,
  StateMachineTransitionCreate,
} from "@qontinui/shared-types";

// =============================================================================
// Action Derivation
// =============================================================================

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
export function deriveAction(elementId: string): {
  name: string;
  action: TransitionAction;
} {
  if (elementId.startsWith("url:") || elementId.startsWith("nav:")) {
    const label = elementId.includes(":")
      ? elementId.split(":").slice(1).join(":")
      : elementId;
    return {
      name: `Navigate to ${label}`,
      action: { type: "navigate", url: label },
    };
  }

  if (elementId.startsWith("text:")) {
    const label = elementId.includes(":")
      ? elementId.split(":").slice(1).join(":")
      : elementId;
    return {
      name: `Type in ${label}`,
      action: { type: "type", target: elementId, text: "" },
    };
  }

  if (elementId.startsWith("role:")) {
    const roleLabel = elementId.slice(5).toLowerCase();
    if (/select|option|listbox|combobox|dropdown/i.test(roleLabel)) {
      const label = elementId.split(":").slice(1).join(":");
      return {
        name: `Select ${label}`,
        action: { type: "select", target: elementId },
      };
    }
  }

  const label = elementId.includes(":")
    ? elementId.split(":").slice(1).join(":")
    : elementId;
  return {
    name: `Click ${label}`,
    action: { type: "click", target: elementId },
  };
}

// =============================================================================
// Transition Lookup
// =============================================================================

/**
 * Find a transition between two states (source → target direction).
 */
export function findExistingTransition(
  transitions: StateMachineTransition[],
  sourceStateId: string,
  targetStateId: string,
): StateMachineTransition | undefined {
  return transitions.find(
    (t) =>
      t.from_states.includes(sourceStateId) &&
      t.activate_states.includes(targetStateId),
  );
}

// =============================================================================
// Transition Creation Helpers
// =============================================================================

/**
 * Build a transition create payload from a drag-and-drop operation.
 *
 * @param sourceStateId - The state the element is dragged from
 * @param targetStateId - The state the element is dropped onto
 * @param elementId - The element being dragged (determines action type)
 * @returns A StateMachineTransitionCreate ready to submit
 */
export function buildTransitionFromDrag(
  sourceStateId: string,
  targetStateId: string,
  elementId: string,
): StateMachineTransitionCreate {
  const { name, action } = deriveAction(elementId);
  const exitStates = sourceStateId !== targetStateId ? [sourceStateId] : [];

  return {
    name,
    from_states: [sourceStateId],
    activate_states: [targetStateId],
    exit_states: exitStates,
    actions: [action],
    path_cost: 1.0,
    stays_visible: false,
  };
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a state for completeness.
 */
export function validateState(
  state: Partial<StateMachineState>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!state.name?.trim()) {
    errors.push({ field: "name", message: "State name is required" });
  }

  if (!state.element_ids || state.element_ids.length === 0) {
    errors.push({
      field: "element_ids",
      message: "State must have at least one element",
    });
  }

  return errors;
}

/**
 * Validate a transition for completeness.
 */
export function validateTransition(
  transition: Partial<StateMachineTransition>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!transition.name?.trim()) {
    errors.push({ field: "name", message: "Transition name is required" });
  }

  if (!transition.from_states || transition.from_states.length === 0) {
    errors.push({
      field: "from_states",
      message: "Transition must have at least one source state",
    });
  }

  if (!transition.activate_states || transition.activate_states.length === 0) {
    errors.push({
      field: "activate_states",
      message: "Transition must activate at least one state",
    });
  }

  if (!transition.actions || transition.actions.length === 0) {
    errors.push({
      field: "actions",
      message: "Transition must have at least one action",
    });
  }

  return errors;
}

/**
 * Check if a transition would create a self-loop (source = target).
 */
export function isSelfLoop(
  fromStates: string[],
  activateStates: string[],
): boolean {
  return fromStates.some((s) => activateStates.includes(s));
}

// =============================================================================
// Element Analysis
// =============================================================================

/**
 * Count elements by type prefix across all states.
 */
export function countElementsByType(
  states: StateMachineState[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const state of states) {
    for (const elementId of state.element_ids) {
      const prefix = elementId.split(":")[0];
      counts[prefix] = (counts[prefix] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Find states that contain a given element.
 */
export function findStatesWithElement(
  states: StateMachineState[],
  elementId: string,
): StateMachineState[] {
  return states.filter((s) => s.element_ids.includes(elementId));
}

/**
 * Get all unique element IDs across all states.
 */
export function getAllElementIds(states: StateMachineState[]): string[] {
  const ids = new Set<string>();
  for (const state of states) {
    for (const elementId of state.element_ids) {
      ids.add(elementId);
    }
  }
  return Array.from(ids);
}
