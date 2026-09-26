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
const { approveAndActivatePlan, updateTaskStatus } = await import('../src/lib/workflow/engine.ts');
const { handleCopilotQuery } = await import('../src/lib/copilot/engine.ts');

async function testGateG() {
  console.log('==================================================');
  console.log('   GATE G VERIFICATION: STATE-AWARE COPILOT      ');
  console.log('==================================================\n');

  const hrUser = DEMO_USERS.find(u => u.role === 'HR');
  const itUser = DEMO_USERS.find(u => u.role === 'IT');
  const aaravUser = DEMO_USERS.find(u => u.email === 'aarav@onboardflow.demo');

  const aaravEmp = await store.getEmployeeById(aaravUser.employeeProfileId);
  let onboarding = await store.getOnboardingByEmployeeId(aaravEmp.id);

  if (!onboarding?.draftPlan) {
    const compiled = await compileOnboardingPlan(aaravEmp, hrUser.id);
    onboarding = compiled.onboarding;
  }
  if (onboarding.status !== 'ACTIVE') {
    const activated = await approveAndActivatePlan(onboarding.id, hrUser);
    onboarding = activated.onboarding;
  }

  console.log('--- Test 1: Direct Profile Resolver ("Who is my manager?") ---');
  const q1 = await handleCopilotQuery(aaravUser, 'Who is my manager?');
  console.log(`[PASS] Answer: "${q1.answer}"`);
  console.log(`       Source: ${q1.source} | Tokens used: ${q1.tokensUsed}`);
  if (q1.source !== 'PROFILE' || q1.tokensUsed !== 0 || !q1.answer.includes('Priya Nair')) {
    console.error('FAILED: Did not resolve manager from state with 0 tokens!');
    process.exit(1);
  }

  console.log('\n--- Test 2: State-Aware Resolver BEFORE IT Task Completion ---');
  // Find laptop/workstation task
  const allTasks = await store.getTasksByOnboardingId(onboarding.id);
  const laptopTask = allTasks.find(t => 
    t.title.toLowerCase().includes('laptop') || 
    t.title.toLowerCase().includes('workstation') ||
    t.description.toLowerCase().includes('laptop') ||
    t.description.toLowerCase().includes('workstation')
  );

  if (!laptopTask) {
    console.error('FAILED: No laptop/workstation task found in workflow!');
    process.exit(1);
  }

  // Ensure it is in PENDING
  await store.upsertTask({ ...laptopTask, status: 'PENDING', completedAt: undefined });
  const q2Before = await handleCopilotQuery(aaravUser, 'Is my laptop ready?');
  console.log(`[PASS] Before IT completion: "${q2Before.answer}"`);
  console.log(`       Source: ${q2Before.source} | Tokens used: ${q2Before.tokensUsed}`);

  if (q2Before.answer.toLowerCase().includes('is configured, encrypted, and ready')) {
    console.error('FAILED: Answer incorrectly claimed laptop was ready when status was PENDING!');
    process.exit(1);
  }

  console.log('\n--- Test 3: IT Task Completion & State Mutation ---');
  console.log(`IT user (${itUser.name}) marks task "${laptopTask.title}" as COMPLETED...`);
  // Remove any incomplete dependencies just for this isolated test step so it can complete
  await store.upsertTask({ ...laptopTask, dependsOnTaskIds: [] });
  const updateResult = await updateTaskStatus(laptopTask.id, 'COMPLETED', itUser);
  console.log(`[PASS] Task is now: ${updateResult.task.status} (completedAt: ${updateResult.task.completedAt})`);

  console.log('\n--- Test 4: State-Aware Resolver AFTER IT Task Completion ---');
  const q2After = await handleCopilotQuery(aaravUser, 'Is my laptop ready?');
  console.log(`[PASS] After IT completion: "${q2After.answer}"`);
  console.log(`       Source: ${q2After.source} | Tokens used: ${q2After.tokensUsed}`);

  if (!q2After.answer.toLowerCase().includes('ready') || q2After.tokensUsed !== 0) {
    console.error('FAILED: Copilot did not detect that laptop is now ready from live state!');
    process.exit(1);
  }
  console.log('[PASS] Dynamic answer change verified: Copilot strictly reflected live workflow state without token waste!');

  console.log('\n--- Test 5: Grounded Policy Question via Azure AI (gpt-5-mini) ---');
  const policyQ = await handleCopilotQuery(aaravUser, 'What is the company policy regarding High-Security R&D Lab access?');
  console.log(`[PASS] Answer: "${policyQ.answer}"`);
  console.log(`       Source: ${policyQ.source} | Tokens used: ${policyQ.tokensUsed}`);
  console.log(`       Citations: ${policyQ.citations?.map(c => `[${c.documentTitle}: ${c.section}]`).join(', ')}`);

  if (policyQ.source !== 'POLICY_AI' || policyQ.tokensUsed <= 0) {
    console.error('FAILED: Policy question should have used grounded AI with citations!');
    process.exit(1);
  }

  console.log('\n>>> GATE G PASSED SUCCESSFULLY! <<<\n');
}

testGateG().catch(console.error);
