const BASE_URL = 'http://localhost:3000';

async function runSmokeTests() {
  console.log('================================================================');
  console.log('🚀 OMNIPRESENT AUTOMATED END-TO-END SMOKE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Health & Server Readiness
  // -------------------------------------------------------------
  console.log('--- TEST 1: Health & Integration Diagnostics ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health/integrations`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, `Server health check responded 200 OK`);
    assert(healthData.configured?.azureOpenAI !== undefined, `Azure OpenAI integration configured: ${healthData.configured?.azureOpenAI}`);
    assert(healthData.configured?.azureIdentity !== undefined, `Azure Managed Identity configured: ${healthData.configured?.azureIdentity}`);
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Username & Password Authentication
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Username & Password Authentication ---');
  let hrCookie = '';
  try {
    // 2a. Valid HR credentials with usernameOrEmail
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'hr@omnipresent.ai',
        password: 'Omnipresent2026!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success, 'HR login with usernameOrEmail + password succeeded');
    assert(loginData.user?.role === 'HR', `Authenticated role is HR (${loginData.user?.name})`);

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) hrCookie = setCookie.split(';')[0];

    // 2b. Username shortcut (e.g. "aarav")
    const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'aarav',
        password: 'Omnipresent2026!',
      }),
    });
    const empData = await empLoginRes.json();
    assert(empLoginRes.status === 200 && empData.user?.role === 'EMPLOYEE', `Employee login via username shortcut "aarav" succeeded (${empData.user?.name})`);

    // 2c. Invalid password rejection
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'hr@omnipresent.ai',
        password: 'WrongPassword999!',
      }),
    });
    assert(badLoginRes.status === 401, 'Invalid password correctly rejected with 401 Unauthorized');
  } catch (err) {
    assert(false, `Authentication test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: HRIS Webhook Normalization & Idempotency Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: HRIS Inbound Ingestion & Idempotency ---');
  try {
    // Reset seed first for clean state
    await fetch(`${BASE_URL}/api/onboarding/reset`, { method: 'POST', headers: { Cookie: hrCookie } });

    const presetsRes = await fetch(`${BASE_URL}/api/integrations/hris/demo/events`);
    const presetsData = await presetsRes.json();
    const preset = presetsData.presets[0]; // Aarav Sharma

    const ingestRes = await fetch(`${BASE_URL}/api/integrations/hris/demo/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hrCookie },
      body: JSON.stringify(preset),
    });
    const ingestData = await ingestRes.json();
    assert(ingestRes.status === 200 && ingestData.status === 'PROCESSED', 'HRIS event successfully ingested and normalized to DRAFT');
    assert(ingestData.employee?.workEmail === 'aarav@onboardflow.demo', `Canonical employee email correctly mapped: ${ingestData.employee?.workEmail}`);

    // Re-ingest same event (Idempotency verification)
    const duplicateRes = await fetch(`${BASE_URL}/api/integrations/hris/demo/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: hrCookie },
      body: JSON.stringify(preset),
    });
    const duplicateData = await duplicateRes.json();
    assert(duplicateData.status === 'DUPLICATE_IGNORED', 'Idempotency verified: Duplicate event rejected (DUPLICATE_IGNORED)');
  } catch (err) {
    assert(false, `HRIS test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Plan Compilation, Approval & Parallel Task Dispatch
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: AI Plan Compilation & Parallel Queue Dispatch ---');
  let onboardingId = '';
  try {
    const listRes = await fetch(`${BASE_URL}/api/onboarding`, { headers: { Cookie: hrCookie } });
    const listData = await listRes.json();
    const targetCase = listData.onboardings[0];
    onboardingId = targetCase.id;

    // Generate Plan via Hybrid RAG compiler
    const planRes = await fetch(`${BASE_URL}/api/onboarding/${onboardingId}/generate-plan`, {
      method: 'POST',
      headers: { Cookie: hrCookie },
    });
    const planData = await planRes.json();
    const tasksCompiled = planData.plan?.tasks || planData.draftPlan?.tasks || [];
    assert(planRes.status === 200 && tasksCompiled.length > 0, `Compiled AI plan with ${tasksCompiled.length} parallel tasks`);

    // Approve Plan & dispatch to queues
    const approveRes = await fetch(`${BASE_URL}/api/onboarding/${onboardingId}/approve`, {
      method: 'POST',
      headers: { Cookie: hrCookie },
    });
    const approveData = await approveRes.json();
    const approvedTasks = approveData.tasks || [];
    assert(approveRes.status === 200 && (approveData.onboarding?.status === 'ACTIVE' || approveData.status === 'ACTIVE'), 'Plan approved and status transitioned to ACTIVE');
    assert(approvedTasks.length > 0 || approveData.taskCount > 0, `Dispatched parallel tasks to departmental queues`);
  } catch (err) {
    assert(false, `Plan compilation test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5: State-Aware Copilot & Hybrid RAG Resolution
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: State-Aware Copilot & Hybrid RAG Retrieval ---');
  try {
    // Authenticate as Aarav Sharma to query Copilot
    const aaravLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: 'aarav', password: 'Omnipresent2026!' }),
    });
    const aaravCookie = aaravLogin.headers.get('set-cookie')?.split(';')[0] || '';

    // 5a. Deterministic State Resolver (Tasks query: 0 tokens, instant)
    const taskMsgRes = await fetch(`${BASE_URL}/api/copilot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: aaravCookie },
      body: JSON.stringify({ message: 'What are my tasks?' }),
    });
    const taskMsgData = await taskMsgRes.json();
    assert(taskMsgData.source === 'GRAPH' || taskMsgData.source === 'STATE', `Task query resolved via state/graph resolver (Source: ${taskMsgData.source})`);
    assert(taskMsgData.tokensUsed === 0, 'Zero LLM tokens consumed for live graph fact');
    assert(taskMsgData.answer.length > 20, 'Categorized task response returned');

    // 5b. Location Resolver
    const locMsgRes = await fetch(`${BASE_URL}/api/copilot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: aaravCookie },
      body: JSON.stringify({ message: 'Where are we?' }),
    });
    const locMsgData = await locMsgRes.json();
    assert(locMsgData.source === 'PROFILE', `Location query resolved via PROFILE fact (Source: ${locMsgData.source})`);
    assert(locMsgData.answer.includes('Bengaluru') || locMsgData.answer.includes('office'), `Correct office location returned`);

    // 5c. Hybrid RAG Policy Query (k-NN + BM25)
    const policyMsgRes = await fetch(`${BASE_URL}/api/copilot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: aaravCookie },
      body: JSON.stringify({ message: 'What is the policy for High-Security Lab access?' }),
    });
    const policyMsgData = await policyMsgRes.json();
    assert(policyMsgData.source === 'HYBRID_RAG', `Policy query resolved via HYBRID_RAG engine (Source: ${policyMsgData.source})`);
    assert(policyMsgData.citations?.length > 0, `Hybrid RAG citations returned (${policyMsgData.citations?.length} documents cited)`);
    assert(policyMsgData.ragDiagnostics?.vectorSimilarity > 0, `k-NN vector similarity calculated: ${policyMsgData.ragDiagnostics?.vectorSimilarity}%`);
  } catch (err) {
    assert(false, `Copilot test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Stakeholder Task Execution & Operational Blocker
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Task Status Transitions & Operational Blocker ---');
  try {
    const tasksRes = await fetch(`${BASE_URL}/api/tasks`, { headers: { Cookie: hrCookie } });
    const tasksData = await tasksRes.json();
    const targetTask = tasksData.tasks.find((t) => t.onboardingId === onboardingId) || tasksData.tasks[0];
    const targetOnboardingId = targetTask.onboardingId;

    // Transition to IN_PROGRESS
    const startRes = await fetch(`${BASE_URL}/api/tasks/${targetTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: hrCookie },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const startData = await startRes.json();
    assert(startData.task?.status === 'IN_PROGRESS', `Task transitioned to IN_PROGRESS`);

    // Block Task
    const blockRes = await fetch(`${BASE_URL}/api/tasks/${targetTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: hrCookie },
      body: JSON.stringify({ status: 'BLOCKED', blockerReason: 'Awaiting hardware shipment from vendor' }),
    });
    const blockData = await blockRes.json();
    assert(blockData.task?.status === 'BLOCKED', `Task successfully BLOCKED with reason`);
    assert(blockData.task?.blockerReason.includes('hardware'), `Blocker reason preserved`);

    // Verify Audit Trail recorded the blocker
    const auditRes = await fetch(`${BASE_URL}/api/onboarding/${targetOnboardingId}/audit`, { headers: { Cookie: hrCookie } });
    const auditData = await auditRes.json();
    const eventList = auditData.events || auditData.auditEvents || [];
    const hasBlockedAudit = eventList.some((e) => e.eventType === 'TASK_BLOCKED');
    assert(hasBlockedAudit, 'Immutable audit event TASK_BLOCKED verified in ledger');

    // Complete Task
    const completeRes = await fetch(`${BASE_URL}/api/tasks/${targetTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: hrCookie },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const completeData = await completeRes.json();
    assert(completeData.task?.status === 'COMPLETED', `Task successfully marked COMPLETED`);
  } catch (err) {
    assert(false, `Task transition test failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`SMOKE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
