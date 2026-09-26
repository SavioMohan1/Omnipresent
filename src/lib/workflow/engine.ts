import 'server-only';
import {
  OnboardingDocument,
  TaskDocument,
  TaskStatus,
  AuditEvent,
} from '@/lib/types/models';
import { SessionUser } from '@/lib/auth/types';
import { assertStakeholderQueueAccess, assertRole } from '@/lib/authz';
import { store } from '@/lib/data/store';

export async function approveAndActivatePlan(
  onboardingId: string,
  actor: SessionUser
): Promise<{ onboarding: OnboardingDocument; tasks: TaskDocument[] }> {
  assertRole(actor, ['HR']);

  let onboarding = await store.getOnboardingById(onboardingId);
  // Fallback if employee ID was passed
  if (!onboarding) {
    onboarding = await store.getOnboardingByEmployeeId(onboardingId);
  }

  if (!onboarding) {
    throw new Error(`Onboarding record not found for ID '${onboardingId}'.`);
  }

  if (!onboarding.draftPlan || !onboarding.draftPlan.tasks?.length) {
    throw new Error('Cannot approve onboarding: No compiled draft plan exists.');
  }

  const now = new Date().toISOString();
  const clientToTaskMap = new Map<string, string>();

  // 1. Pre-generate task IDs so dependencies can be resolved to task IDs
  for (const clientTask of onboarding.draftPlan.tasks) {
    const taskId = `task-${onboarding.id}-${clientTask.clientTaskId}`;
    clientToTaskMap.set(clientTask.clientTaskId, taskId);
  }

  // 2. Map CompiledTask to TaskDocument
  const tasks: TaskDocument[] = onboarding.draftPlan.tasks.map((ct) => {
    const taskId = clientToTaskMap.get(ct.clientTaskId)!;
    const resolvedDepIds = (ct.dependsOnClientTaskIds || [])
      .map((clientDepId) => clientToTaskMap.get(clientDepId))
      .filter((id): id is string => Boolean(id));

    return {
      id: taskId,
      onboardingId: onboarding.id,
      employeeId: onboarding.employeeId,
      clientTaskId: ct.clientTaskId,
      stakeholder: ct.stakeholder,
      category: ct.category,
      title: ct.title,
      description: ct.description,
      instructions: ct.instructions,
      reason: ct.reason,
      policyRefs: ct.policyRefs,
      priority: ct.priority,
      required: ct.required,
      dependsOnTaskIds: resolvedDepIds,
      status: 'PENDING',
      createdAt: now,
    };
  });

  // 3. Persist tasks
  await store.upsertTasks(tasks);

  // 4. Update onboarding status
  const updatedOnboarding: OnboardingDocument = {
    ...onboarding,
    status: 'ACTIVE',
    progressPercent: 0,
    approvedAt: now,
    approvedByUserId: actor.id,
  };
  await store.upsertOnboarding(updatedOnboarding);

  // 5. Audit Event
  await store.addAuditEvent({
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    onboardingId: onboarding.id,
    actorUserId: actor.id,
    actorRole: 'HR',
    eventType: 'PLAN_APPROVED',
    details: {
      taskCount: tasks.length,
      approvedBy: actor.email,
    },
    timestamp: now,
  });

  return { onboarding: updatedOnboarding, tasks };
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  actor: SessionUser,
  blockerReason?: string
): Promise<{ task: TaskDocument; onboarding: OnboardingDocument }> {
  const task = await store.getTaskById(taskId);
  if (!task) {
    throw new Error(`Task with ID '${taskId}' not found.`);
  }

  // RBAC: Verify actor is authorized to mutate this stakeholder's queue
  assertStakeholderQueueAccess(actor, task.stakeholder);

  const now = new Date().toISOString();

  // Dependency Guard: Cannot transition to IN_PROGRESS or COMPLETED if unresolved dependencies exist
  if (newStatus === 'IN_PROGRESS' || newStatus === 'COMPLETED') {
    if (task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) {
      const allTasks = await store.getTasksByOnboardingId(task.onboardingId);
      const taskMap = new Map(allTasks.map((t) => [t.id, t]));

      const incompleteDeps = task.dependsOnTaskIds
        .map((depId) => taskMap.get(depId))
        .filter((dep) => dep && dep.status !== 'COMPLETED');

      if (incompleteDeps.length > 0) {
        const depNames = incompleteDeps.map((d) => `'${d!.title}' (${d!.status})`).join(', ');
        throw new Error(
          `Cannot transition task to ${newStatus}: Unresolved prerequisite tasks must be COMPLETED first: ${depNames}.`
        );
      }
    }
  }

  // Update task attributes
  const updatedTask: TaskDocument = {
    ...task,
    status: newStatus,
    startedAt:
      newStatus === 'IN_PROGRESS' && !task.startedAt ? now : task.startedAt,
    completedAt: newStatus === 'COMPLETED' ? now : undefined,
    blockerReason: newStatus === 'BLOCKED' ? blockerReason || 'Blocked by external dependency.' : undefined,
  };

  await store.upsertTask(updatedTask);

  // Recalculate Onboarding Progress
  const allTasks = await store.getTasksByOnboardingId(task.onboardingId);
  const requiredTasks = allTasks.filter((t) => t.required);
  const completedCount = requiredTasks.filter(
    (t) => (t.id === task.id ? newStatus === 'COMPLETED' : t.status === 'COMPLETED')
  ).length;

  const progressPercent =
    requiredTasks.length > 0
      ? Math.round((completedCount / requiredTasks.length) * 100)
      : 100;

  const onboarding = await store.getOnboardingById(task.onboardingId);
  if (!onboarding) {
    throw new Error(`Parent onboarding '${task.onboardingId}' not found.`);
  }

  const isAllComplete = progressPercent === 100 && requiredTasks.length > 0;
  const updatedOnboarding: OnboardingDocument = {
    ...onboarding,
    progressPercent,
    status: isAllComplete ? 'COMPLETED' : onboarding.status,
    completedAt: isAllComplete ? now : onboarding.completedAt,
  };

  await store.upsertOnboarding(updatedOnboarding);

  // Record Audit Event
  let eventType: AuditEvent['eventType'] = 'TASK_STARTED';
  if (newStatus === 'COMPLETED') eventType = 'TASK_COMPLETED';
  if (newStatus === 'BLOCKED') eventType = 'TASK_BLOCKED';

  await store.addAuditEvent({
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    onboardingId: onboarding.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    eventType,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      stakeholder: task.stakeholder,
      previousStatus: task.status,
      newStatus,
      blockerReason,
      newProgressPercent: progressPercent,
    },
    timestamp: now,
  });

  return { task: updatedTask, onboarding: updatedOnboarding };
}

export async function getTasksForUser(
  actor: SessionUser,
  onboardingId?: string
): Promise<TaskDocument[]> {
  // 1. HR has global oversight
  if (actor.role === 'HR') {
    if (onboardingId) return store.getTasksByOnboardingId(onboardingId);
    const all = await store.getAllOnboardings();
    const taskLists = await Promise.all(
      all.map((o) => store.getTasksByOnboardingId(o.id))
    );
    return taskLists.flat();
  }

  // 2. Employee sees all tasks for their own onboarding
  if (actor.role === 'EMPLOYEE') {
    const employee = await store.getEmployeeById(actor.employeeProfileId || '');
    if (!employee) return [];
    const onb = await store.getOnboardingByEmployeeId(employee.id);
    if (!onb) return [];
    return store.getTasksByOnboardingId(onb.id);
  }

  // 3. Manager sees tasks for their own onboarding or their direct reports
  if (actor.role === 'MANAGER') {
    const managerTasks: TaskDocument[] = [];
    const allOnboardings = await store.getAllOnboardings();

    for (const onb of allOnboardings) {
      if (onboardingId && onb.id !== onboardingId) continue;
      const tasks = await store.getTasksByOnboardingId(onb.id);
      for (const t of tasks) {
        if (t.stakeholder === 'MANAGER') {
          managerTasks.push(t);
        }
      }
    }
    return managerTasks;
  }

  // 4. Functional Stakeholders (SECURITY, IT, CAFETERIA) only see their own queue!
  return store.getTasksByStakeholder(actor.role, onboardingId);
}
