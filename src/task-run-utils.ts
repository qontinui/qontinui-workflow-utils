import type { TaskRun } from "@qontinui/shared-types/task-run";

export function isTaskRunning(task: TaskRun): boolean {
  return task.status === "running";
}

export function isTaskComplete(task: TaskRun): boolean {
  return task.status === "complete";
}

export function isTaskFailed(task: TaskRun): boolean {
  return task.status === "failed" || task.status === "stopped";
}

export function isTaskFinished(task: TaskRun): boolean {
  return task.status !== "running";
}
