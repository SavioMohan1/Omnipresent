import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/lib/auth/service';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  usernameOrEmail: z.string().optional(),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid login payload format.', details: result.error.format() },
        { status: 400 }
      );
    }

    const { email, username, usernameOrEmail, password } = result.data;
    const identifier = (usernameOrEmail || username || email || '').trim();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Username or email identifier is required.' },
        { status: 400 }
      );
    }

    const user = await loginUser(identifier, password);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
