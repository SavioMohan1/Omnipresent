import { NextRequest, NextResponse } from 'next/server';
import { demoHRISConnector, DEMO_PRESET_EVENTS } from '@/lib/hris/connectors/demo';
import { store } from '@/lib/data/store';
import { getCurrentUser } from '@/lib/auth/service';
import { OnboardingDocument, AuditEvent, IntegrationEvent } from '@/lib/types/models';

export const dynamic = 'force-dynamic';

function verifyAuthorization(request: NextRequest, isHRUser: boolean): boolean {
  // 1. Check HR user session
  if (isHRUser) return true;

  // 2. Check secret header
  const configuredSecret = process.env.DEMO_HRIS_SECRET || 'demo-hris-secret-synthetic-events-67890';
  const providedSecret = request.headers.get('x-onboardflow-demo-secret');
  if (providedSecret && providedSecret === configuredSecret) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const isHR = user?.role === 'HR';

    if (!verifyAuthorization(request, isHR)) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing valid x-onboardflow-demo-secret header or HR session.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const normalized = await demoHRISConnector.normalizeInboundEvent(body);

    // 1. Idempotency Check
    const existingEvent = await store.getIntegrationEvent(demoHRISConnector.provider, normalized.eventId);
    if (existingEvent && existingEvent.status === 'PROCESSED') {
      return NextResponse.json({
        status: 'DUPLICATE_IGNORED',
        message: 'Event has already been processed. Idempotency enforced; no duplicate onboarding created.',
        eventId: normalized.eventId,
        employeeId: existingEvent.employeeId,
        onboardingId: existingEvent.onboardingId,
      });
    }

    // 2. Upsert Canonical Employee
    await store.upsertEmployee(normalized.employee);

    // 3. Create or fetch existing Onboarding in DRAFT state
    let onboarding = await store.getOnboardingByEmployeeId(normalized.employee.id);
    const isNew = !onboarding;

    if (!onboarding) {
      onboarding = {
        id: `onb-${normalized.employee.id}`,
        employeeId: normalized.employee.id,
        externalSystem: demoHRISConnector.provider,
        status: 'DRAFT',
        progressPercent: 0,
        planVersion: 0,
        createdAt: new Date().toISOString(),
      };
      await store.upsertOnboarding(onboarding);
    }

    // 4. Record Audit Event
    const auditEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      onboardingId: onboarding.id,
      actorUserId: user?.id,
      actorRole: user ? user.role : 'SYSTEM',
      eventType: 'HRIS_INGESTED',
      details: {
        eventId: normalized.eventId,
        externalEmployeeId: normalized.employee.externalEmployeeId,
        jobTitle: normalized.employee.jobTitle,
        department: normalized.employee.department,
        isNewOnboarding: isNew,
      },
      timestamp: new Date().toISOString(),
    };
    await store.addAuditEvent(auditEvent);

    // 5. Record Integration Event for Idempotency
    const integrationEvent: IntegrationEvent = {
      id: `integ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      source: demoHRISConnector.provider,
      eventId: normalized.eventId,
      eventType: normalized.eventType,
      receivedAt: new Date().toISOString(),
      status: 'PROCESSED',
      employeeId: normalized.employee.id,
      onboardingId: onboarding.id,
      payload: body,
    };
    await store.recordIntegrationEvent(integrationEvent);

    // 6. Sync back to HRIS (simulation)
    await demoHRISConnector.syncOnboardingStatus(
      normalized.employee.externalEmployeeId,
      onboarding.status
    );

    return NextResponse.json({
      status: 'PROCESSED',
      message: isNew
        ? 'Synthetic employee event received. Canonical employee created and onboarding initialized in DRAFT state.'
        : 'Synthetic employee event received. Updated existing employee record; onboarding preserved.',
      eventId: normalized.eventId,
      employee: normalized.employee,
      onboarding,
      isNew,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process HRIS event.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    presets: DEMO_PRESET_EVENTS,
  });
}
