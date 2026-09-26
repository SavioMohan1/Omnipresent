import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/service';
import { DEMO_USERS, DEMO_PASSWORD_DEFAULT } from '@/lib/auth/demo-users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  const demoAccounts = DEMO_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    jobTitle: u.jobTitle,
    demoPassword: DEMO_PASSWORD_DEFAULT,
  }));

  return NextResponse.json({
    user,
    demoAccounts,
  });
}
