import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/service';
import { assertAuthenticated } from '@/lib/authz';
import { updateTaskStatus } from '@/lib/workflow/engine';

export const dynamic = 'force-dynamic';

const UpdateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']),
  blockerReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertAuthenticated(user);

    const { id } = await context.params;
    const body = await request.json();
    const result = UpdateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid task update payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const { status, blockerReason } = result.data;
    const outcome = await updateTaskStatus(id, status, user, blockerReason);

    return NextResponse.json({
      success: true,
      task: outcome.task,
      onboarding: outcome.onboarding,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update task.';
    const statusCode = message.includes('Forbidden') ? 403 : message.includes('Cannot transition') ? 409 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
