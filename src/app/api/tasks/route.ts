import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertAuthenticated } from '@/lib/authz';
import { getTasksForUser } from '@/lib/workflow/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertAuthenticated(user);

    const { searchParams } = new URL(request.url);
    const onboardingId = searchParams.get('onboardingId') || undefined;

    const tasks = await getTasksForUser(user, onboardingId);

    return NextResponse.json({
      success: true,
      role: user.role,
      tasks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve tasks.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
