export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  VALIDATED = 'VALIDATED'
}

export const TaskStatusDescriptions: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Task is waiting to be executed',
  [TaskStatus.IN_PROGRESS]: 'Task is currently being executed',
  [TaskStatus.COMPLETED]: 'Task has been completed successfully',
  [TaskStatus.FAILED]: 'Task execution failed',
  [TaskStatus.CANCELLED]: 'Task was cancelled before completion',
  [TaskStatus.VALIDATED]: 'Task result has been validated by another AI'
};

export function isTerminalStatus(status: TaskStatus): boolean {
  return [
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
    TaskStatus.CANCELLED,
    TaskStatus.VALIDATED
  ].includes(status);
}

export function canRetry(status: TaskStatus): boolean {
  return status === TaskStatus.FAILED;
}

export function isActiveStatus(status: TaskStatus): boolean {
  return status === TaskStatus.IN_PROGRESS;
}