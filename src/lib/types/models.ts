export type UserRole =
  | 'HR'
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'SECURITY'
  | 'IT'
  | 'CAFETERIA';

export type Stakeholder = 'HR' | 'MANAGER' | 'SECURITY' | 'IT' | 'CAFETERIA';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN';

export type OnboardingStatus = 'DRAFT' | 'PLAN_READY' | 'ACTIVE' | 'COMPLETED';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserDocument {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  employeeProfileId?: string;
  managerEmployeeIds?: string[];
  passwordHash: string;
  createdAt: string;
}

export interface CanonicalEmployee {
  id: string;
  externalSystem: string;
  externalEmployeeId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  startDate: string;
  managerExternalId?: string;
  managerName?: string;
  costCenter?: string;
  jobLevel?: string;
  businessUnit?: string;
  workMode?: string;
  profileUserId?: string;
}

export interface PolicyRef {
  documentTitle: string;
  section?: string;
}

export interface CompiledTask {
  clientTaskId: string;
  stakeholder: Stakeholder;
  category: string;
  title: string;
  description: string;
  instructions: string;
  priority: Priority;
  required: boolean;
  reason: string;
  policyRefs: PolicyRef[];
  dependsOnClientTaskIds: string[];
}

export interface CompiledPlan {
  summary: string;
  tasks: CompiledTask[];
}

export interface AuditFinding {
  type: 'MISSING_REQUIREMENT' | 'REDUNDANCY' | 'INCONSISTENCY' | 'POLICY_WARNING';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  suggestedTask?: CompiledTask;
  policyRefs: PolicyRef[];
}

export interface OnboardingDocument {
  id: string;
  employeeId: string;
  externalSystem: string;
  status: OnboardingStatus;
  progressPercent: number;
  planVersion: number;
  draftPlan?: CompiledPlan;
  auditFindings?: AuditFinding[];
  createdAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
  completedAt?: string;
}

export interface TaskDocument {
  id: string;
  onboardingId: string;
  employeeId: string;
  clientTaskId?: string;
  stakeholder: Stakeholder;
  assignedUserId?: string;
  category: string;
  title: string;
  description: string;
  instructions: string;
  reason: string;
  policyRefs: PolicyRef[];
  priority: Priority;
  required: boolean;
  dependsOnTaskIds: string[];
  status: TaskStatus;
  blockerReason?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AuditEvent {
  id: string;
  onboardingId: string;
  actorUserId?: string;
  actorRole?: UserRole | 'SYSTEM';
  eventType:
    | 'PLAN_COMPILED'
    | 'PLAN_EDITED'
    | 'PLAN_APPROVED'
    | 'TASK_STARTED'
    | 'TASK_BLOCKED'
    | 'TASK_COMPLETED'
    | 'COPILOT_QUERY'
    | 'HRIS_INGESTED';
  details: Record<string, unknown>;
  timestamp: string;
}

export interface IntegrationEvent {
  id: string;
  source: string;
  eventId: string;
  eventType: string;
  receivedAt: string;
  status: 'PROCESSED' | 'FAILED' | 'DUPLICATE_IGNORED';
  employeeId?: string;
  onboardingId?: string;
  payload: unknown;
}

export interface AIUsageRecord {
  id: string;
  onboardingId?: string;
  operation: 'PLAN_COMPILE' | 'PLAN_AUDIT' | 'COPILOT' | 'BLOCKER_SUMMARY';
  deployment: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
}
