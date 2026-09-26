import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertRole } from '@/lib/authz';
import { store } from '@/lib/data/store';
import { compileOnboardingPlan } from '@/lib/ai/compiler';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ['HR']);

    const { id } = await context.params;
    let onboarding = await store.getOnboardingById(id);
    let employee = onboarding ? await store.getEmployeeById(onboarding.employeeId) : null;

    // Fallback: If passed parameter was employee ID directly
    if (!onboarding) {
      employee = await store.getEmployeeById(id);
      if (employee) {
        onboarding = await store.getOnboardingByEmployeeId(employee.id);
      }
    }

    if (!employee) {
      return NextResponse.json(
        { error: `Employee or Onboarding record not found for ID '${id}'.` },
        { status: 404 }
      );
    }

    const result = await compileOnboardingPlan(employee, user.id);

    return NextResponse.json({
      success: true,
      onboarding: result.onboarding,
      plan: result.plan,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plan compilation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
