import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertRole } from '@/lib/authz';
import { approveAndActivatePlan } from '@/lib/workflow/engine';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ['HR']);

    const { id } = await context.params;
    const result = await approveAndActivatePlan(id, user);

    return NextResponse.json({
      success: true,
      message: 'Plan approved. Tasks activated into parallel stakeholder queues.',
      onboarding: result.onboarding,
      tasks: result.tasks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plan approval failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
