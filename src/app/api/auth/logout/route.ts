import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth/service';

export const dynamic = 'force-dynamic';

export async function POST() {
  await logoutUser();
  return NextResponse.json({ success: true, message: 'Logged out successfully.' });
}
