import type {
  ScheduleExpression,
  ScheduledTaskType,
  ScheduledTask,
  ScheduledTaskStatus,
  ScheduleConditions,
  ConditionStatus,
} from "@qontinui/shared-types/scheduler";

export function describeSchedule(schedule: ScheduleExpression): string {
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
    case "Condition":
      return schedule.value?.rearm_delay_minutes
        ? `On condition (rearm: ${schedule.value.rearm_delay_minutes}min)`
        : "On condition";
    default: {
      // Fallback for runner-specific schedule variants not in the wire contract
      // (e.g. "State" schedules carry a state_id via the index signature).
      const anySchedule = schedule as { type?: string; state_id?: string };
      if (anySchedule.type === "State" && typeof anySchedule.state_id === "string") {
        return `On state: ${anySchedule.state_id}`;
      }
      return `Schedule: ${anySchedule.type ?? "unknown"}`;
    }
  }
}

export function describeCron(cron: string): string {
  const patterns: Record<string, string> = {
    "0 0 * * * *": "Every hour",
    "0 0 0 * * *": "Every day at midnight",
    "0 0 9 * * *": "Every day at 9 AM",
    "0 0 9 * * 1-5": "Weekdays at 9 AM",
    "0 0 0 * * 0": "Every Sunday at midnight",
    "0 0 0 1 * *": "First day of every month",
  };
  return patterns[cron] ?? `Cron: ${cron}`;
}

export function describeInterval(seconds: number): string {
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

export function describeTaskType(task: ScheduledTaskType): string {
  switch (task.task_type) {
    case "Workflow":
      return `Workflow: ${task.workflow_name}`;
    case "Prompt":
      return `Prompt: ${task.prompt_id}`;
    case "AutoFix":
      return "Auto-Fix";
    case "Watcher":
      return `Watcher: ${task.watcher_id}`;
    case "BackgroundCapture":
      return `Background capture (every ${task.capture_interval_secs}s)`;
  }
}

export function getSchedulerStatusColor(
  status: ScheduledTaskStatus,
): string {
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

export function isScheduledTaskRunning(task: ScheduledTask): boolean {
  return task.last_run?.status === "running";
}

export function hasCompletedSuccessfully(task: ScheduledTask): boolean {
  return task.last_run?.success === true;
}

export function getTimeUntilNextRun(task: ScheduledTask): string | null {
  if (!task.next_run) return null;
  try {
    const diff = new Date(task.next_run).getTime() - Date.now();
    if (diff < 0) return "Overdue";
    const seconds = Math.floor(diff / 1000);
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

export function isWaitingForConditions(task: ScheduledTask): boolean {
  return task.condition_status !== undefined && task.condition_status !== null;
}

export function hasConditions(task: ScheduledTask): boolean {
  if (!task.conditions) return false;
  const idleEnabled = task.conditions.require_idle?.enabled ?? false;
  const repoEnabled =
    task.conditions.require_repo_inactive?.enabled === true &&
    (task.conditions.require_repo_inactive?.repositories?.length ?? 0) > 0;
  return idleEnabled || repoEnabled;
}

export function describeConditions(conditions: ScheduleConditions): string {
  const parts: string[] = [];
  if (conditions.require_idle?.enabled) parts.push("Wait for idle");
  if (conditions.require_repo_inactive?.enabled) {
    const repos = conditions.require_repo_inactive.repositories;
    if (repos.length === 1)
      parts.push(
        `Wait for repo inactive (${repos[0].inactive_minutes}min)`,
      );
    else if (repos.length > 1)
      parts.push(`Wait for ${repos.length} repos inactive`);
  }
  if (conditions.timeout_minutes)
    parts.push(`timeout: ${conditions.timeout_minutes}min`);
  return parts.length > 0 ? parts.join(", ") : "No conditions";
}

export function getConditionStatusText(status: ConditionStatus): string {
  if (status.timed_out) return "Timed out";
  const parts: string[] = [];
  if (status.idle_met !== undefined)
    parts.push(status.idle_met ? "Idle" : "Waiting for idle");
  if (status.repo_inactive_met) {
    const inactive = status.repo_inactive_met.filter(
      ([, met]) => met,
    ).length;
    const total = status.repo_inactive_met.length;
    parts.push(
      inactive === total
        ? "Repos inactive"
        : `Repos: ${inactive}/${total} inactive`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : "Checking conditions...";
}
