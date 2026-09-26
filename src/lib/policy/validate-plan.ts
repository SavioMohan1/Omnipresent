import { CompiledPlan, CompiledTask, Stakeholder, CanonicalEmployee } from '@/lib/types/models';

export interface ValidationError {
  ruleId: string;
  message: string;
  clientTaskId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const ALLOWED_STAKEHOLDERS: Set<Stakeholder> = new Set([
  'HR',
  'MANAGER',
  'SECURITY',
  'IT',
  'CAFETERIA',
]);

export function validatePlan(
  plan: CompiledPlan,
  employee: CanonicalEmployee
): ValidationResult {
  const errors: ValidationError[] = [];
  const taskMap = new Map<string, CompiledTask>();

  // 1. Task array size check
  if (!plan.tasks || plan.tasks.length === 0) {
    return {
      valid: false,
      errors: [{ ruleId: 'PLAN_EMPTY', message: 'Plan contains no tasks.' }],
    };
  }

  // 2. Uniqueness of clientTaskIds and allowed stakeholders
  for (const task of plan.tasks) {
    if (taskMap.has(task.clientTaskId)) {
      errors.push({
        ruleId: 'DUPLICATE_TASK_ID',
        message: `Duplicate clientTaskId: ${task.clientTaskId}`,
        clientTaskId: task.clientTaskId,
      });
    }
    taskMap.set(task.clientTaskId, task);

    if (!ALLOWED_STAKEHOLDERS.has(task.stakeholder)) {
      errors.push({
        ruleId: 'INVALID_STAKEHOLDER',
        message: `Invalid stakeholder '${task.stakeholder}'. Must be one of HR, MANAGER, SECURITY, IT, CAFETERIA.`,
        clientTaskId: task.clientTaskId,
      });
    }

    if (!task.title || task.title.trim().length === 0) {
      errors.push({
        ruleId: 'EMPTY_TITLE',
        message: `Task ${task.clientTaskId} has empty title.`,
        clientTaskId: task.clientTaskId,
      });
    }
  }

  // 3. Dependencies exist and no self-dependency
  for (const task of plan.tasks) {
    for (const depId of task.dependsOnClientTaskIds || []) {
      if (depId === task.clientTaskId) {
        errors.push({
          ruleId: 'SELF_DEPENDENCY',
          message: `Task ${task.clientTaskId} cannot depend on itself.`,
          clientTaskId: task.clientTaskId,
        });
      } else if (!taskMap.has(depId)) {
        errors.push({
          ruleId: 'MISSING_DEPENDENCY',
          message: `Task ${task.clientTaskId} references non-existent dependency: ${depId}`,
          clientTaskId: task.clientTaskId,
        });
      }
    }
  }

  // 4. Cycle Detection (DAG check)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(taskId: string): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    for (const depId of task?.dependsOnClientTaskIds || []) {
      if (!visited.has(depId)) {
        if (hasCycle(depId)) return true;
      } else if (recursionStack.has(depId)) {
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const taskId of taskMap.keys()) {
    if (!visited.has(taskId)) {
      if (hasCycle(taskId)) {
        errors.push({
          ruleId: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving task: ${taskId}`,
          clientTaskId: taskId,
        });
        break;
      }
    }
  }

  // 5. Invariant Checks based on role
  const isEngineering =
    employee.department.toLowerCase().includes('engineer') ||
    employee.jobTitle.toLowerCase().includes('engineer');
  const isSales =
    employee.department.toLowerCase().includes('sales') ||
    employee.jobTitle.toLowerCase().includes('sales');

  if (isEngineering) {
    const hasCodeOrRepoTask = plan.tasks.some(
      (t) =>
        t.title.toLowerCase().includes('github') ||
        t.title.toLowerCase().includes('repo') ||
        t.title.toLowerCase().includes('code') ||
        t.title.toLowerCase().includes('developer') ||
        t.category.toLowerCase().includes('engineering') ||
        t.description.toLowerCase().includes('github')
    );
    if (!hasCodeOrRepoTask) {
      errors.push({
        ruleId: 'ROLE_POLICY_VIOLATION',
        message: 'Engineering roles must include codebase/repository onboarding task.',
      });
    }
  }

  if (isSales) {
    const hasSalesOrCrmTask = plan.tasks.some(
      (t) =>
        t.title.toLowerCase().includes('crm') ||
        t.title.toLowerCase().includes('salesforce') ||
        t.title.toLowerCase().includes('sales') ||
        t.category.toLowerCase().includes('sales') ||
        t.description.toLowerCase().includes('crm')
    );
    if (!hasSalesOrCrmTask) {
      errors.push({
        ruleId: 'ROLE_POLICY_VIOLATION',
        message: 'Sales roles must include CRM/Salesforce onboarding task.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
