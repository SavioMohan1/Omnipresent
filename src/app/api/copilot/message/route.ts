import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/service';
import { assertAuthenticated } from '@/lib/authz';
import { handleCopilotQuery } from '@/lib/copilot/engine';

export const dynamic = 'force-dynamic';

const CopilotQuerySchema = z.object({
  message: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertAuthenticated(user);

    const body = await request.json();
    const parsed = CopilotQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid message query.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await handleCopilotQuery(user, parsed.data.message);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Copilot query failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
