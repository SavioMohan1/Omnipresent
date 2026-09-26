import { UserRole } from '@/lib/types/models';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  employeeProfileId?: string;
  managerEmployeeIds?: string[];
}

export interface AuthSession {
  user: SessionUser;
  expiresAt: number;
}
