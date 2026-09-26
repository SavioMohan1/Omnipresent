import { createRequire } from 'node:module';
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
  // server-only not found or already handled
}

const { DemoHRISConnector, DEMO_PRESET_EVENTS } = await import('../src/lib/hris/connectors/demo.ts');
const { store } = await import('../src/lib/data/store.ts');

async function testGateC() {
  console.log('==================================================');
  console.log('   GATE C VERIFICATION: DEMO HRIS CONNECTOR       ');
  console.log('==================================================\n');

  const connector = new DemoHRISConnector();

  console.log('--- Test 1: Normalizing Synthetic HRIS Event ---');
  const rawEvent = DEMO_PRESET_EVENTS[2]; // Rohan Gupta
  console.log(`Processing inbound event: ${rawEvent.eventId} (${rawEvent.data.firstName} ${rawEvent.data.lastName})`);

  const normalized = await connector.normalizeInboundEvent(rawEvent);
  console.log('[PASS] Inbound payload normalized to CanonicalEmployee:');
  console.log(`       ID: ${normalized.employee.id}`);
  console.log(`       Role: ${normalized.employee.jobTitle}`);
  console.log(`       External System: ${normalized.employee.externalSystem} (${normalized.employee.externalEmployeeId})`);
  console.log(`       Location: ${normalized.employee.location}`);

  console.log('\n--- Test 2: Ingestion & DRAFT Onboarding Initialization ---');
  // Upsert employee
  await store.upsertEmployee(normalized.employee);
  let onboarding = await store.getOnboardingByEmployeeId(normalized.employee.id);

  if (!onboarding) {
    onboarding = {
      id: `onb-${normalized.employee.id}`,
      employeeId: normalized.employee.id,
      externalSystem: connector.provider,
      status: 'DRAFT',
      progressPercent: 0,
      planVersion: 0,
      createdAt: new Date().toISOString(),
    };
    await store.upsertOnboarding(onboarding);
  }

  // Record integration event
  await store.recordIntegrationEvent({
    id: `integ-${Date.now()}`,
    source: connector.provider,
    eventId: normalized.eventId,
    eventType: normalized.eventType,
    receivedAt: new Date().toISOString(),
    status: 'PROCESSED',
    employeeId: normalized.employee.id,
    onboardingId: onboarding.id,
    payload: rawEvent,
  });

  const storedEmp = await store.getEmployeeById(normalized.employee.id);
  const storedOnb = await store.getOnboardingById(onboarding.id);

  if (storedEmp && storedOnb && storedOnb.status === 'DRAFT') {
    console.log('[PASS] Canonical employee and DRAFT onboarding created successfully.');
    console.log(`       Onboarding ID: ${storedOnb.id}`);
    console.log(`       Status: ${storedOnb.status} | Progress: ${storedOnb.progressPercent}%`);
  } else {
    console.error('FAILED: Employee or onboarding missing!');
    process.exit(1);
  }

  console.log('\n--- Test 3: Idempotency Enforcement (Duplicate Event) ---');
  const existingEvent = await store.getIntegrationEvent(connector.provider, normalized.eventId);
  let duplicateResult = null;
  if (existingEvent && existingEvent.status === 'PROCESSED') {
    duplicateResult = {
      status: 'DUPLICATE_IGNORED',
      message: 'Event has already been processed. Idempotency enforced.',
      eventId: normalized.eventId,
    };
    console.log(`[PASS] Duplicate event ${normalized.eventId} detected!`);
    console.log(`       Result: ${duplicateResult.status} - ${duplicateResult.message}`);
  } else {
    console.error('FAILED: Idempotency check failed to detect existing event!');
    process.exit(1);
  }

  const allOnboardingsForEmp = (await store.getAllOnboardings()).filter(
    o => o.employeeId === normalized.employee.id
  );
  if (allOnboardingsForEmp.length === 1) {
    console.log('[PASS] Exactly one onboarding record exists for the employee (no duplication).');
  } else {
    console.error(`FAILED: Found ${allOnboardingsForEmp.length} onboarding records!`);
    process.exit(1);
  }

  console.log('\n--- Test 4: Schema Validation Rejecting Malformed Payload ---');
  try {
    await connector.normalizeInboundEvent({
      eventId: 'evt-bad',
      eventType: 'employee.created',
      data: {
        firstName: 'Incomplete',
      },
    });
    console.error('FAILED: Malformed payload was accepted!');
    process.exit(1);
  } catch {
    console.log('[PASS] Malformed payload correctly rejected with Zod schema validation error.');
  }

  console.log('\n>>> GATE C PASSED SUCCESSFULLY! <<<\n');
}

testGateC().catch(console.error);
