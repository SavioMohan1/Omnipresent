import 'server-only';
import {
  UserDocument,
  CanonicalEmployee,
  OnboardingDocument,
  TaskDocument,
  AuditEvent,
  IntegrationEvent,
  AIUsageRecord,
  Stakeholder,
} from '@/lib/types/models';
import { DEMO_USERS } from '@/lib/auth/demo-users';

// Pre-seeded canonical employees
const INITIAL_EMPLOYEES: CanonicalEmployee[] = [
  {
    id: 'emp-aarav-sharma',
    externalSystem: 'DEMO_HRIS',
    externalEmployeeId: 'HR-9921',
    firstName: 'Aarav',
    lastName: 'Sharma',
    workEmail: 'aarav@onboardflow.demo',
    jobTitle: 'Backend Engineer',
    department: 'Engineering',
    location: 'Bengaluru HQ',
    employmentType: 'FULL_TIME',
    startDate: '2026-10-01',
    managerExternalId: 'HR-1002',
    managerName: 'Priya Nair',
    costCenter: 'CC-ENG-01',
    jobLevel: 'L4',
    businessUnit: 'Core Platform',
    workMode: 'HYBRID',
    profileUserId: 'user-aarav-sharma',
  },
  {
    id: 'emp-meera-shah',
    externalSystem: 'DEMO_HRIS',
    externalEmployeeId: 'HR-9922',
    firstName: 'Meera',
    lastName: 'Shah',
    workEmail: 'meera@onboardflow.demo',
    jobTitle: 'Sales Executive',
    department: 'Sales',
    location: 'Mumbai Office',
    employmentType: 'FULL_TIME',
    startDate: '2026-10-05',
    managerExternalId: 'HR-1005',
    managerName: 'Vikram Malhotra',
    costCenter: 'CC-SALES-02',
    jobLevel: 'L3',
    businessUnit: 'Enterprise Growth',
    workMode: 'ONSITE',
    profileUserId: 'user-meera-shah',
  },
];

class MemoryStore {
  private users: Map<string, UserDocument> = new Map();
  private employees: Map<string, CanonicalEmployee> = new Map();
  private onboardings: Map<string, OnboardingDocument> = new Map();
  private tasks: Map<string, TaskDocument> = new Map();
  private auditEvents: AuditEvent[] = [];
  private integrationEvents: Map<string, IntegrationEvent> = new Map();
  private aiUsageRecords: AIUsageRecord[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.users.clear();
    this.employees.clear();
    this.onboardings.clear();
    this.tasks.clear();
    this.auditEvents = [];
    this.integrationEvents.clear();
    this.aiUsageRecords = [];

    // Seed demo users
    for (const u of DEMO_USERS) {
      this.users.set(u.id, { ...u });
    }
    // Seed canonical demo employees
    for (const emp of INITIAL_EMPLOYEES) {
      this.employees.set(emp.id, { ...emp });
    }
  }

  // --- Users ---
  public async getUserById(id: string): Promise<UserDocument | null> {
    return this.users.get(id) || null;
  }

  public async getUserByEmail(identifier: string): Promise<UserDocument | null> {
    const normalized = identifier.toLowerCase().trim();
    const prefix = normalized.split('@')[0];
    for (const user of this.users.values()) {
      const userPrefix = user.email.split('@')[0].toLowerCase();
      if (
        user.email.toLowerCase() === normalized ||
        user.id.toLowerCase() === normalized ||
        user.id.replace('user-', '').toLowerCase() === normalized ||
        user.role.toLowerCase() === normalized ||
        user.name.toLowerCase().includes(normalized) ||
        userPrefix === prefix ||
        userPrefix === normalized
      ) {
        return user;
      }
    }
    return null;
  }

  public async getAllUsers(): Promise<UserDocument[]> {
    return Array.from(this.users.values());
  }

  // --- Employees ---
  public async getEmployeeById(id: string): Promise<CanonicalEmployee | null> {
    return this.employees.get(id) || null;
  }

  public async getEmployeeByExternalId(
    system: string,
    externalId: string
  ): Promise<CanonicalEmployee | null> {
    for (const emp of this.employees.values()) {
      if (emp.externalSystem === system && emp.externalEmployeeId === externalId) {
        return emp;
      }
    }
    return null;
  }

  public async upsertEmployee(employee: CanonicalEmployee): Promise<CanonicalEmployee> {
    this.employees.set(employee.id, { ...employee });
    return employee;
  }

  public async getAllEmployees(): Promise<CanonicalEmployee[]> {
    return Array.from(this.employees.values());
  }

  // --- Onboardings ---
  public async getOnboardingById(id: string): Promise<OnboardingDocument | null> {
    return this.onboardings.get(id) || null;
  }

  public async getOnboardingByEmployeeId(
    employeeId: string
  ): Promise<OnboardingDocument | null> {
    for (const onb of this.onboardings.values()) {
      if (onb.employeeId === employeeId) {
        return onb;
      }
    }
    const normalized = employeeId.replace('-canonical-', '-');
    for (const onb of this.onboardings.values()) {
      if (onb.employeeId.replace('-canonical-', '-') === normalized) {
        return onb;
      }
    }
    return null;
  }

  public async upsertOnboarding(
    onboarding: OnboardingDocument
  ): Promise<OnboardingDocument> {
    this.onboardings.set(onboarding.id, { ...onboarding });
    return onboarding;
  }

  public async getAllOnboardings(): Promise<OnboardingDocument[]> {
    return Array.from(this.onboardings.values());
  }

  // --- Tasks ---
  public async getTaskById(id: string): Promise<TaskDocument | null> {
    return this.tasks.get(id) || null;
  }

  public async getTasksByOnboardingId(onboardingId: string): Promise<TaskDocument[]> {
    const results: TaskDocument[] = [];
    for (const t of this.tasks.values()) {
      if (t.onboardingId === onboardingId) {
        results.push(t);
      }
    }
    return results;
  }

  public async getTasksByStakeholder(
    stakeholder: Stakeholder,
    onboardingId?: string
  ): Promise<TaskDocument[]> {
    const results: TaskDocument[] = [];
    for (const t of this.tasks.values()) {
      if (t.stakeholder === stakeholder) {
        if (!onboardingId || t.onboardingId === onboardingId) {
          results.push(t);
        }
      }
    }
    return results;
  }

  public async upsertTask(task: TaskDocument): Promise<TaskDocument> {
    this.tasks.set(task.id, { ...task });
    return task;
  }

  public async upsertTasks(tasks: TaskDocument[]): Promise<TaskDocument[]> {
    for (const t of tasks) {
      this.tasks.set(t.id, { ...t });
    }
    return tasks;
  }

  // --- Audit Events ---
  public async addAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    this.auditEvents.push({ ...event });
    return event;
  }

  public async getAuditEvents(onboardingId?: string): Promise<AuditEvent[]> {
    if (!onboardingId) return [...this.auditEvents];
    return this.auditEvents.filter((e) => e.onboardingId === onboardingId);
  }

  // --- Integration Events ---
  public async getIntegrationEvent(
    source: string,
    eventId: string
  ): Promise<IntegrationEvent | null> {
    const key = `${source}::${eventId}`;
    return this.integrationEvents.get(key) || null;
  }

  public async recordIntegrationEvent(
    event: IntegrationEvent
  ): Promise<IntegrationEvent> {
    const key = `${event.source}::${event.eventId}`;
    this.integrationEvents.set(key, { ...event });
    return event;
  }

  // --- AI Usage ---
  public async recordAIUsage(record: AIUsageRecord): Promise<AIUsageRecord> {
    this.aiUsageRecords.push({ ...record });
    return record;
  }

  public async getAIUsage(onboardingId?: string): Promise<AIUsageRecord[]> {
    if (!onboardingId) return [...this.aiUsageRecords];
    return this.aiUsageRecords.filter((r) => r.onboardingId === onboardingId);
  }
}

// Global singleton for Next.js development and production lifecycle
const globalForStore = globalThis as unknown as { store: MemoryStore };
export const store = globalForStore.store || new MemoryStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
