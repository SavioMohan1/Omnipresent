import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { assertRole } from '@/lib/authz';
import { store } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    assertRole(user, ['HR']);

    store.reset();

    return NextResponse.json({
      success: true,
      message: 'Demo store successfully reset to initial seed state.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reset failed.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
