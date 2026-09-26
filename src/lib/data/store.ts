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

// Pre-seeded onboarding journeys for initial roster visibility
const INITIAL_ONBOARDINGS: OnboardingDocument[] = [
  {
    id: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    externalSystem: 'DEMO_HRIS',
    status: 'ACTIVE',
    progressPercent: 55,
    planVersion: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    approvedByUserId: 'user-hr',
  },
  {
    id: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    externalSystem: 'DEMO_HRIS',
    status: 'PLAN_READY',
    progressPercent: 15,
    planVersion: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Pre-seeded tasks for parallel queues
const INITIAL_TASKS: TaskDocument[] = [
  {
    id: 'task-aarav-1',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-it-1',
    stakeholder: 'IT',
    category: 'HARDWARE',
    title: 'Stage & Ship MacBook Pro M3 Workstation',
    description: 'Configure corporate workstation with Apple Silicon, FileVault disk encryption, and MDM profile.',
    instructions: '1. Unbox 16-inch MacBook Pro M3.\n2. Apply asset tag #OMNI-7821.\n3. Enroll in Jamf MDM profile.\n4. Enable FileVault encryption.',
    reason: 'Standard enterprise workstation deployment for Core Platform Engineering.',
    policyRefs: [{ documentTitle: 'IT Equipment & Hardware Standards', section: 'Standard Hardware Kits' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-aarav-2',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-sec-1',
    stakeholder: 'SECURITY',
    category: 'COMPLIANCE',
    title: 'Verify National Background Check & RFID Keycard',
    description: 'Confirm national criminal and identity verification clearance and issue Bengaluru HQ badge.',
    instructions: 'Review background check report and activate RFID keycard with 24/7 engineering suite access.',
    reason: 'SOC2 Trust Criteria and physical facility access compliance.',
    policyRefs: [{ documentTitle: 'Information Security Standards', section: 'Physical & Facility Security' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-aarav-3',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-it-2',
    stakeholder: 'IT',
    category: 'ACCESS',
    title: 'Configure Okta Single Sign-On (SSO) & MFA',
    description: 'Assign Okta cloud suite, Google Workspace corporate email, and Duo Mobile push MFA.',
    instructions: 'Enroll corporate email aarav@onboardflow.demo in default engineering SSO group and enforce FIDO2/Duo MFA.',
    reason: 'Identity-driven access control for all internal SaaS tools.',
    policyRefs: [{ documentTitle: 'Information Security Standards', section: 'Access Control & Authentication' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: ['task-aarav-1'],
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'task-aarav-4',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-it-3',
    stakeholder: 'IT',
    category: 'ACCESS',
    title: 'Grant GitHub Enterprise Organization Access',
    description: 'Invite to Omnipresent GitHub organization with Backend Core team permissions and Copilot Enterprise license.',
    instructions: 'Add to @omnipresent/backend-core and assign Copilot seat.',
    reason: 'Codebase access required for daily engineering deliverables.',
    policyRefs: [{ documentTitle: 'Information Security Standards', section: 'Source Code Governance' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: ['task-aarav-3'],
    status: 'BLOCKED',
    blockerReason: 'GitHub Enterprise license pool cap reached; awaiting procurement budget approval from IT Finance.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'task-aarav-5',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-mgr-1',
    stakeholder: 'MANAGER',
    category: 'CULTURE',
    title: 'Assign Technical Mentor & Onboarding Buddy',
    description: 'Pair new hire with Senior Staff Engineer for daily pairing and architecture walkthroughs.',
    instructions: 'Buddy assigned: Priya Nair (Senior Staff Engineer). Schedule daily 15-min check-in on Slack.',
    reason: 'Accelerates developer time-to-first-commit and psychological safety.',
    policyRefs: [{ documentTitle: 'Engineering Onboarding Playbook', section: 'Mentorship' }],
    priority: 'MEDIUM',
    required: true,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-aarav-6',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-mgr-2',
    stakeholder: 'MANAGER',
    category: 'PERFORMANCE',
    title: 'First Week 1:1 & 30-60-90 Day Milestone Review',
    description: 'Conduct welcome 1:1, review team roadmap, and align on Day-30 deliverables.',
    instructions: 'Share engineering RFC guidelines and set first milestone PR objective.',
    reason: 'Role clarity and goal alignment for the new engineer.',
    policyRefs: [{ documentTitle: 'Engineering Onboarding Playbook', section: 'Goal Setting' }],
    priority: 'MEDIUM',
    required: true,
    dependsOnTaskIds: ['task-aarav-5'],
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'task-aarav-7',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-hr-1',
    stakeholder: 'HR',
    category: 'LEGAL',
    title: 'Sign Employee NDA & IP Assignment Agreement',
    description: 'Digital signature for proprietary information and invention assignment agreement.',
    instructions: 'Confirm DocuSign envelope completion and archive copy in HRIS.',
    reason: 'Legal compliance and intellectual property protection.',
    policyRefs: [{ documentTitle: 'Code of Conduct & Compliance', section: 'Confidentiality' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-aarav-8',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-hr-2',
    stakeholder: 'HR',
    category: 'BENEFITS',
    title: 'Enroll in Group Medical Insurance & Direct Deposit',
    description: 'Submit bank routing information and choose health insurance tier.',
    instructions: 'Verify voided check and register employee in benefits portal.',
    reason: 'Payroll processing and statutory benefits entitlement.',
    policyRefs: [{ documentTitle: 'Health Benefits & Wellbeing Guide', section: 'Medical Coverage' }],
    priority: 'MEDIUM',
    required: true,
    dependsOnTaskIds: ['task-aarav-7'],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-aarav-9',
    onboardingId: 'onb-aarav-sharma',
    employeeId: 'emp-aarav-sharma',
    clientTaskId: 'client-caf-1',
    stakeholder: 'CAFETERIA',
    category: 'FACILITIES',
    title: 'Ergonomic Desk Allocation & Cafeteria RFID Sync',
    description: 'Assign Bangalore HQ desk #B4-12 and sync monthly lunch meal credits.',
    instructions: 'Ensure dual 27-inch 4K monitors and USB-C dock are installed at desk #B4-12.',
    reason: 'Day-1 physical workplace readiness.',
    policyRefs: [{ documentTitle: 'Remote Work & Equipment Policy', section: 'Office Facilities' }],
    priority: 'LOW',
    required: false,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  // Meera Shah tasks
  {
    id: 'task-meera-1',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-it-1',
    stakeholder: 'IT',
    category: 'HARDWARE',
    title: 'Stage & Ship Lenovo ThinkPad Carbon Workstation',
    description: 'Configure corporate workstation with Windows 11 Enterprise, Intune MDM, and BitLocker.',
    instructions: '1. Prepare ThinkPad X1 Carbon.\n2. Enroll in Microsoft Intune.\n3. Deploy Microsoft 365 apps.',
    reason: 'Standard sales mobility workstation deployment.',
    policyRefs: [{ documentTitle: 'IT Equipment & Hardware Standards', section: 'Sales Workstations' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'task-meera-2',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-it-2',
    stakeholder: 'IT',
    category: 'ACCESS',
    title: 'Provision Salesforce Enterprise & Zoom Phone',
    description: 'Provision CRM seat with Enterprise Growth territory access and direct virtual phone line.',
    instructions: 'Create Salesforce profile with Enterprise AE role and assign Zoom Phone license.',
    reason: 'Sales pipeline generation and customer communication tooling.',
    policyRefs: [{ documentTitle: 'Information Security Standards', section: 'SaaS Access' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: ['task-meera-1'],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-meera-3',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-sec-1',
    stakeholder: 'SECURITY',
    category: 'COMPLIANCE',
    title: 'Security Awareness & Anti-Phishing Training',
    description: 'Complete mandatory compliance training modules on data privacy and customer confidentiality.',
    instructions: 'Send KnowBe4 security awareness track to meera@onboardflow.demo.',
    reason: 'Customer data protection and GDPR/SOC2 compliance.',
    policyRefs: [{ documentTitle: 'Information Security Standards', section: 'Data Privacy' }],
    priority: 'MEDIUM',
    required: true,
    dependsOnTaskIds: [],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-meera-4',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-mgr-1',
    stakeholder: 'MANAGER',
    category: 'PERFORMANCE',
    title: 'Sales Territory & Key Account Portfolio Handoff',
    description: 'Review assigned enterprise accounts, quota milestones, and sales methodology.',
    instructions: 'Schedule 2-hour deep dive on Q4 enterprise pipeline and target accounts.',
    reason: 'Ramp-up on revenue expectations and enterprise sales playbook.',
    policyRefs: [{ documentTitle: 'Code of Conduct & Compliance', section: 'Sales Integrity' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-meera-5',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-hr-1',
    stakeholder: 'HR',
    category: 'LEGAL',
    title: 'Execute Non-Disclosure Agreement & Employment Agreement',
    description: 'Execute bilateral NDA and standard enterprise offer letter addendum.',
    instructions: 'Verify DocuSign envelope and countersign by HR Director.',
    reason: 'Statutory employment compliance.',
    policyRefs: [{ documentTitle: 'Code of Conduct & Compliance', section: 'Confidentiality' }],
    priority: 'HIGH',
    required: true,
    dependsOnTaskIds: [],
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-meera-6',
    onboardingId: 'onb-meera-shah',
    employeeId: 'emp-meera-shah',
    clientTaskId: 'client-meera-caf-1',
    stakeholder: 'CAFETERIA',
    category: 'FACILITIES',
    title: 'Mumbai Office Access Badge & Hot-Desk Registration',
    description: 'Issue Bandra-Kurla Complex building RFID pass and register hot-desk locker.',
    instructions: 'Confirm Mumbai facilities team activates visitor-to-employee access tier.',
    reason: 'On-site workplace access.',
    policyRefs: [{ documentTitle: 'Remote Work & Equipment Policy', section: 'Office Facilities' }],
    priority: 'LOW',
    required: false,
    dependsOnTaskIds: [],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Pre-seeded immutable audit ledger entries
const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'audit-seed-1',
    onboardingId: 'onb-aarav-sharma',
    actorUserId: 'system',
    actorRole: 'SYSTEM',
    eventType: 'HRIS_INGESTED',
    details: { message: 'Inbound event normalized from Workday (HR-9921: Aarav Sharma)' },
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'audit-seed-2',
    onboardingId: 'onb-aarav-sharma',
    actorUserId: 'user-hr',
    actorRole: 'HR',
    eventType: 'PLAN_COMPILED',
    details: { taskCount: 9, summary: 'AI plan compiled with 9 parallel tasks across IT, Security, Manager, and HR.' },
    timestamp: new Date(Date.now() - 86400000 * 2.5).toISOString(),
  },
  {
    id: 'audit-seed-3',
    onboardingId: 'onb-aarav-sharma',
    actorUserId: 'user-hr',
    actorRole: 'HR',
    eventType: 'PLAN_APPROVED',
    details: { approvedBy: 'Helen Reed (HR)', status: 'ACTIVE' },
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'audit-seed-4',
    onboardingId: 'onb-aarav-sharma',
    actorUserId: 'user-it',
    actorRole: 'IT',
    eventType: 'TASK_COMPLETED',
    details: { taskTitle: 'Stage & Ship MacBook Pro M3 Workstation', taskId: 'task-aarav-1' },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'audit-seed-5',
    onboardingId: 'onb-aarav-sharma',
    actorUserId: 'user-it',
    actorRole: 'IT',
    eventType: 'TASK_BLOCKED',
    details: {
      taskTitle: 'Grant GitHub Enterprise Organization Access',
      taskId: 'task-aarav-4',
      reason: 'GitHub Enterprise license pool cap reached; awaiting procurement budget approval from IT Finance.',
    },
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
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
    // Seed initial onboardings
    for (const onb of INITIAL_ONBOARDINGS) {
      this.onboardings.set(onb.id, { ...onb });
    }
    // Seed initial tasks
    for (const task of INITIAL_TASKS) {
      this.tasks.set(task.id, { ...task });
    }
    // Seed initial audit trail
    this.auditEvents = [...INITIAL_AUDIT_EVENTS];
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
globalForStore.store = store;
