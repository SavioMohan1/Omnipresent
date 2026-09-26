import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertRole } from '@/lib/authz';
import { store } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    // Allow all authenticated users to read onboarding data according to role
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allOnboardings = await store.getAllOnboardings();
    const allEmployees = await store.getAllEmployees();
    const empMap = new Map(allEmployees.map((e) => [e.id, e]));

    const enriched = await Promise.all(
      allOnboardings.map(async (onb) => {
        const employee = empMap.get(onb.employeeId) || null;
        const tasks = await store.getTasksByOnboardingId(onb.id);
        const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');

        return {
          ...onb,
          employee,
          taskCount: tasks.length,
          completedTaskCount: tasks.filter((t) => t.status === 'COMPLETED').length,
          blockedTaskCount: blockedTasks.length,
          blockedTasks: blockedTasks.map((t) => ({
            id: t.id,
            title: t.title,
            stakeholder: t.stakeholder,
            blockerReason: t.blockerReason,
          })),
        };
      })
    );

    // If Employee, filter only their own
    if (user.role === 'EMPLOYEE') {
      const filtered = enriched.filter((o) => o.employee?.profileUserId === user.id);
      return NextResponse.json({ onboardings: filtered });
    }

    return NextResponse.json({ onboardings: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve onboardings.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
