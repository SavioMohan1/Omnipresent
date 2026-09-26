import 'server-only';
import { UserRole, Stakeholder } from '@/lib/types/models';
import { SessionUser } from '@/lib/auth/types';

export class AuthorizationError extends Error {
  public statusCode: number;

  constructor(message: string = 'Forbidden: Access denied.', statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

export function assertAuthenticated(user: SessionUser | null | undefined): asserts user is SessionUser {
  if (!user) {
    throw new AuthorizationError('Unauthorized: Please log in.', 401);
  }
}

export function assertRole(user: SessionUser | null | undefined, allowedRoles: UserRole[]): asserts user is SessionUser {
  assertAuthenticated(user);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      `Forbidden: Role '${user.role}' is not authorized. Allowed roles: ${allowedRoles.join(', ')}.`
    );
  }
}

export function assertEmployeeAccess(user: SessionUser, employeeId: string): void {
  // HR has global visibility
  if (user.role === 'HR') return;

  // Employee can only access their own profile
  if (user.role === 'EMPLOYEE') {
    if (user.employeeProfileId === employeeId) return;
    throw new AuthorizationError('Forbidden: You can only view your own onboarding records.');
  }

  // Manager can only access assigned subordinates
  if (user.role === 'MANAGER') {
    if (user.managerEmployeeIds?.includes(employeeId)) return;
    throw new AuthorizationError('Forbidden: Employee is not assigned to your team.');
  }

  // Functional stakeholders (SECURITY, IT, CAFETERIA) do not have direct full employee record access
  throw new AuthorizationError(`Forbidden: Role '${user.role}' cannot view direct employee record.`);
}

export function assertStakeholderQueueAccess(user: SessionUser, targetStakeholder: Stakeholder): void {
  // HR can oversee all queues
  if (user.role === 'HR') return;

  // Specific stakeholder roles can only access their respective queue
  if (user.role === targetStakeholder) return;

  throw new AuthorizationError(
    `Forbidden: Role '${user.role}' cannot access or mutate tasks in '${targetStakeholder}' queue.`
  );
}
