import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertRole } from '@/lib/authz';
import { store } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ['HR', 'EMPLOYEE', 'MANAGER', 'SECURITY', 'IT', 'CAFETERIA']);

    const { id } = await context.params;
    let onboarding = await store.getOnboardingById(id);
    if (!onboarding) {
      onboarding = await store.getOnboardingByEmployeeId(id);
    }

    if (!onboarding) {
      return NextResponse.json({ error: 'Onboarding not found.' }, { status: 404 });
    }

    const events = await store.getAuditEvents(onboarding.id);

    return NextResponse.json({
      success: true,
      onboardingId: onboarding.id,
      events,
      auditEvents: events,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve audit events.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
