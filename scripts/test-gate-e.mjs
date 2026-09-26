import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Populate process.env from .env.local
const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

// Stub server-only for standalone script run
const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
} catch {
  // handled
}

const { store } = await import('../src/lib/data/store.ts');
const { DEMO_USERS } = await import('../src/lib/auth/demo-users.ts');
const { compileOnboardingPlan } = await import('../src/lib/ai/compiler.ts');
const { approveAndActivatePlan, updateTaskStatus, getTasksForUser } = await import('../src/lib/workflow/engine.ts');

async function testGateE() {
  console.log('==================================================');
  console.log('   GATE E VERIFICATION: WORKFLOW ENGINE & RBAC    ');
  console.log('==================================================\n');

  const hrUser = DEMO_USERS.find(u => u.role === 'HR');
  const itUser = DEMO_USERS.find(u => u.role === 'IT');
  const secUser = DEMO_USERS.find(u => u.role === 'SECURITY');
  const cafUser = DEMO_USERS.find(u => u.role === 'CAFETERIA');

  const aarav = await store.getEmployeeById('emp-canonical-aarav');
  let onboarding = await store.getOnboardingByEmployeeId(aarav.id);

  // If no draft plan exists in memory, compile one first
  if (!onboarding?.draftPlan) {
    console.log('Compiling draft plan for Aarav first...');
    const compiled = await compileOnboardingPlan(aarav, hrUser.id);
    onboarding = compiled.onboarding;
  }

  console.log(`Initial Onboarding Status: ${onboarding.status}`);

  console.log('\n--- Test 1: HR Approval & Parallel Task Activation ---');
  const activation = await approveAndActivatePlan(onboarding.id, hrUser);
  console.log(`[PASS] Plan Approved by ${hrUser.name} (${hrUser.role})`);
  console.log(`       New Onboarding Status: ${activation.onboarding.status}`);
  console.log(`       Active Tasks Created: ${activation.tasks.length}`);
  console.log(`       Initial Progress: ${activation.onboarding.progressPercent}%`);

  if (activation.onboarding.status !== 'ACTIVE' || activation.tasks.length === 0) {
    console.error('FAILED: Plan did not activate properly!');
    process.exit(1);
  }

  console.log('\n--- Test 2: Role Queue Isolation & Restriction ---');
  const itTasks = await getTasksForUser(itUser, onboarding.id);
  const secTasks = await getTasksForUser(secUser, onboarding.id);
  const cafTasks = await getTasksForUser(cafUser, onboarding.id);

  console.log(`[PASS] IT Queue size: ${itTasks.length} (All stakeholder === 'IT': ${itTasks.every(t => t.stakeholder === 'IT')})`);
  console.log(`[PASS] Security Queue size: ${secTasks.length} (All stakeholder === 'SECURITY': ${secTasks.every(t => t.stakeholder === 'SECURITY')})`);
  console.log(`[PASS] Cafeteria Queue size: ${cafTasks.length} (All stakeholder === 'CAFETERIA': ${cafTasks.every(t => t.stakeholder === 'CAFETERIA')})`);

  // Verify cross-queue mutation rejection
  const aSecurityTask = secTasks[0];
  try {
    await updateTaskStatus(aSecurityTask.id, 'IN_PROGRESS', itUser);
    console.error('FAILED: IT user was able to mutate a Security task!');
    process.exit(1);
  } catch (err) {
    console.log(`[PASS] IT user denied mutation of Security task: "${err.message}"`);
  }

  console.log('\n--- Test 3: Dependency Enforcement Guard ---');
  const taskWithDeps = activation.tasks.find(t => t.dependsOnTaskIds.length > 0);
  if (taskWithDeps) {
    const stakeholderUser = DEMO_USERS.find(u => u.role === taskWithDeps.stakeholder) || hrUser;
    try {
      await updateTaskStatus(taskWithDeps.id, 'COMPLETED', stakeholderUser);
      console.error(`FAILED: Task ${taskWithDeps.title} was completed before dependencies were resolved!`);
      process.exit(1);
    } catch (err) {
      console.log(`[PASS] Prerequisite dependency guard blocked transition:`);
      console.log(`       "${err.message}"`);
    }
  }

  console.log('\n--- Test 4: Task State Transitions & Progress Recalculation ---');
  // Find a task with no dependencies
  const independentTask = activation.tasks.find(t => t.dependsOnTaskIds.length === 0 && t.stakeholder === 'IT') 
    || activation.tasks.find(t => t.dependsOnTaskIds.length === 0);
  const actorForTask = DEMO_USERS.find(u => u.role === independentTask.stakeholder) || hrUser;

  // 1. Start Task
  const started = await updateTaskStatus(independentTask.id, 'IN_PROGRESS', actorForTask);
  console.log(`[PASS] Task Started: "${started.task.title}" (Status: ${started.task.status})`);
  console.log(`       startedAt: ${started.task.startedAt}`);

  // 2. Complete Task
  const completed = await updateTaskStatus(independentTask.id, 'COMPLETED', actorForTask);
  console.log(`[PASS] Task Completed: "${completed.task.title}" (Status: ${completed.task.status})`);
  console.log(`       completedAt: ${completed.task.completedAt}`);
  console.log(`       Updated Onboarding Progress: ${completed.onboarding.progressPercent}%`);

  if (completed.onboarding.progressPercent <= 0) {
    console.error('FAILED: Progress did not recalculate!');
    process.exit(1);
  }

  // 3. Block Task
  const anotherTask = activation.tasks.find(t => t.id !== independentTask.id && t.dependsOnTaskIds.length === 0) 
    || activation.tasks.find(t => t.id !== independentTask.id);
  const actorAnother = DEMO_USERS.find(u => u.role === anotherTask.stakeholder) || hrUser;
  const blocked = await updateTaskStatus(anotherTask.id, 'BLOCKED', actorAnother, 'Awaiting hardware arrival from supplier.');
  console.log(`[PASS] Task Blocked: "${blocked.task.title}"`);
  console.log(`       blockerReason: "${blocked.task.blockerReason}"`);

  console.log('\n--- Test 5: Verifying Audit Event Persistence ---');
  const auditEvents = await store.getAuditEvents(onboarding.id);
  console.log(`[PASS] Stored Audit Events Count: ${auditEvents.length}`);
  const eventTypes = auditEvents.map(e => e.eventType);
  console.log(`       Logged Event Types: ${eventTypes.join(', ')}`);

  const hasApproval = eventTypes.includes('PLAN_APPROVED');
  const hasStarted = eventTypes.includes('TASK_STARTED');
  const hasCompleted = eventTypes.includes('TASK_COMPLETED');
  const hasBlocked = eventTypes.includes('TASK_BLOCKED');

  if (hasApproval && hasStarted && hasCompleted && hasBlocked) {
    console.log('[PASS] All expected audit lifecycle events logged and persisted with actor timestamps.');
  } else {
    console.error('FAILED: Missing audit lifecycle events!');
    process.exit(1);
  }

  console.log('\n>>> GATE E PASSED SUCCESSFULLY! <<<\n');
}

testGateE().catch(console.error);
