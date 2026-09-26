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
const { compileOnboardingPlan } = await import('../src/lib/ai/compiler.ts');

async function testGateD() {
  console.log('==================================================');
  console.log('   GATE D VERIFICATION: AI ONBOARDING COMPILER    ');
  console.log('==================================================\n');

  console.log('Connecting to Azure OpenAI (gpt-5-mini)...');
  const aarav = await store.getEmployeeById('emp-canonical-aarav');
  const meera = await store.getEmployeeById('emp-canonical-meera');

  if (!aarav || !meera) {
    console.error('Missing canonical employee records for testing!');
    process.exit(1);
  }

  console.log(`\n--- Test 1: Compiling Onboarding Graph for Backend Engineer (${aarav.firstName} ${aarav.lastName}) ---`);
  const aaravResult = await compileOnboardingPlan(aarav, 'user-hr');
  console.log(`[PASS] Azure AI Plan Compiled for Aarav (${aarav.jobTitle}):`);
  console.log(`       Summary: ${aaravResult.plan.summary.substring(0, 100)}...`);
  console.log(`       Task Count: ${aaravResult.plan.tasks.length}`);
  console.log(`       Status: ${aaravResult.onboarding.status}`);

  for (const t of aaravResult.plan.tasks) {
    console.log(`       - [${t.stakeholder}] ${t.title} (${t.priority}) -> deps: [${t.dependsOnClientTaskIds.join(', ')}]`);
  }

  console.log(`\n--- Test 2: Compiling Onboarding Graph for Sales Executive (${meera.firstName} ${meera.lastName}) ---`);
  const meeraResult = await compileOnboardingPlan(meera, 'user-hr');
  console.log(`[PASS] Azure AI Plan Compiled for Meera (${meera.jobTitle}):`);
  console.log(`       Summary: ${meeraResult.plan.summary.substring(0, 100)}...`);
  console.log(`       Task Count: ${meeraResult.plan.tasks.length}`);
  console.log(`       Status: ${meeraResult.onboarding.status}`);

  for (const t of meeraResult.plan.tasks) {
    console.log(`       - [${t.stakeholder}] ${t.title} (${t.priority}) -> deps: [${t.dependsOnClientTaskIds.join(', ')}]`);
  }

  console.log('\n--- Test 3: Verifying Meaningful Role Differentiation ---');
  const aaravTaskTitles = aaravResult.plan.tasks.map(t => t.title.toLowerCase() + ' ' + t.description.toLowerCase()).join(' ');
  const meeraTaskTitles = meeraResult.plan.tasks.map(t => t.title.toLowerCase() + ' ' + t.description.toLowerCase()).join(' ');

  const aaravHasEng = aaravTaskTitles.includes('github') || aaravTaskTitles.includes('repo') || aaravTaskTitles.includes('code') || aaravTaskTitles.includes('developer');
  const meeraHasSales = meeraTaskTitles.includes('crm') || meeraTaskTitles.includes('salesforce') || meeraTaskTitles.includes('sales') || meeraTaskTitles.includes('pipeline');

  if (aaravHasEng) {
    console.log('[PASS] Backend Engineer plan contains technical/codebase tasks.');
  } else {
    console.error('FAILED: Backend Engineer plan missing codebase/engineering tasks!');
    process.exit(1);
  }

  if (meeraHasSales) {
    console.log('[PASS] Sales Executive plan contains CRM/Sales enablement tasks.');
  } else {
    console.error('FAILED: Sales Executive plan missing CRM/Sales tasks!');
    process.exit(1);
  }

  console.log('\n--- Test 4: Verifying Tasks Remain Inactive (PLAN_READY) Before HR Approval ---');
  const activeTasksForAarav = await store.getTasksByOnboardingId(aaravResult.onboarding.id);
  const activeTasksForMeera = await store.getTasksByOnboardingId(meeraResult.onboarding.id);

  if (activeTasksForAarav.length === 0 && activeTasksForMeera.length === 0) {
    console.log('[PASS] Zero tasks active in stakeholder queues. Plans are staged as draft in PLAN_READY status.');
    console.log(`       Aarav Onboarding Status: ${aaravResult.onboarding.status}`);
    console.log(`       Meera Onboarding Status: ${meeraResult.onboarding.status}`);
  } else {
    console.error('FAILED: Active tasks were created before HR approval!');
    process.exit(1);
  }

  console.log('\n>>> GATE D PASSED SUCCESSFULLY! <<<\n');
}

testGateD().catch(console.error);
