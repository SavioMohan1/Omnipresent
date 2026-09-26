import 'server-only';
import bcrypt from 'bcryptjs';
import { store } from '@/lib/data/store';
import { SessionUser } from '@/lib/auth/types';
import { getSessionUser, setSessionCookie, clearSessionCookie } from '@/lib/auth/session';

export async function loginUser(email: string, password: string): Promise<SessionUser> {
  const user = await store.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    jobTitle: user.jobTitle,
    employeeProfileId: user.employeeProfileId,
    managerEmployeeIds: user.managerEmployeeIds,
  };

  await setSessionCookie(sessionUser);
  return sessionUser;
}

export async function logoutUser(): Promise<void> {
  await clearSessionCookie();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}
