import 'server-only';
import { z } from 'zod';
import { CanonicalEmployee, EmploymentType, OnboardingStatus } from '@/lib/types/models';
import { CanonicalHRISEvent, HRISConnector } from '@/lib/hris/types';
import { store } from '@/lib/data/store';

export const DemoRawEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.enum(['employee.created', 'employee.updated']),
  timestamp: z.string().optional(),
  data: z.object({
    employeeId: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    workEmail: z.string().email(),
    jobTitle: z.string().min(1),
    department: z.string().min(1),
    location: z.string().min(1),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).default('FULL_TIME'),
    startDate: z.string().min(1),
    managerId: z.string().optional(),
    managerName: z.string().optional(),
    costCenter: z.string().optional(),
    jobLevel: z.string().optional(),
    businessUnit: z.string().optional(),
    workMode: z.string().optional(),
  }),
});

export type DemoRawEvent = z.infer<typeof DemoRawEventSchema>;

export class DemoHRISConnector implements HRISConnector {
  public readonly provider = 'DEMO_HRIS';

  public async normalizeInboundEvent(payload: unknown): Promise<CanonicalHRISEvent> {
    const parsed = DemoRawEventSchema.parse(payload);
    const { data } = parsed;

    const canonicalId = `emp-${data.firstName.toLowerCase()}-${data.lastName.toLowerCase()}`;
    const profileUserId = `user-${data.firstName.toLowerCase()}-${data.lastName.toLowerCase()}`;

    const canonicalEmployee: CanonicalEmployee = {
      id: canonicalId,
      externalSystem: this.provider,
      externalEmployeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      workEmail: data.workEmail,
      jobTitle: data.jobTitle,
      department: data.department,
      location: data.location,
      employmentType: data.employmentType as EmploymentType,
      startDate: data.startDate,
      managerExternalId: data.managerId,
      managerName: data.managerName,
      costCenter: data.costCenter,
      jobLevel: data.jobLevel,
      businessUnit: data.businessUnit,
      workMode: data.workMode || 'HYBRID',
      profileUserId,
    };

    return {
      eventId: parsed.eventId,
      eventType: parsed.eventType,
      timestamp: parsed.timestamp || new Date().toISOString(),
      employee: canonicalEmployee,
    };
  }

  public async getEmployee(externalEmployeeId: string): Promise<CanonicalEmployee | null> {
    return store.getEmployeeByExternalId(this.provider, externalEmployeeId);
  }

  public async syncOnboardingStatus(
    externalEmployeeId: string,
    status: OnboardingStatus
  ): Promise<void> {
    // In production, would call external HRIS webhook or patch endpoint.
    console.log(`[DEMO_HRIS] Synced onboarding status '${status}' for external employee '${externalEmployeeId}'.`);
  }
}

export const demoHRISConnector = new DemoHRISConnector();

// Presets for Demo UI
export const DEMO_PRESET_EVENTS: DemoRawEvent[] = [
  {
    eventId: 'evt-hris-aarav-001',
    eventType: 'employee.created',
    timestamp: '2026-09-26T08:00:00.000Z',
    data: {
      employeeId: 'HR-9921',
      firstName: 'Aarav',
      lastName: 'Sharma',
      workEmail: 'aarav@onboardflow.demo',
      jobTitle: 'Backend Engineer',
      department: 'Engineering',
      location: 'Bengaluru HQ',
      employmentType: 'FULL_TIME',
      startDate: '2026-10-01',
      managerId: 'HR-1002',
      managerName: 'Priya Nair',
      costCenter: 'CC-ENG-01',
      jobLevel: 'L4',
      businessUnit: 'Core Platform',
      workMode: 'HYBRID',
    },
  },
  {
    eventId: 'evt-hris-meera-002',
    eventType: 'employee.created',
    timestamp: '2026-09-26T08:30:00.000Z',
    data: {
      employeeId: 'HR-9922',
      firstName: 'Meera',
      lastName: 'Shah',
      workEmail: 'meera@onboardflow.demo',
      jobTitle: 'Sales Executive',
      department: 'Sales',
      location: 'Mumbai Office',
      employmentType: 'FULL_TIME',
      startDate: '2026-10-05',
      managerId: 'HR-1005',
      managerName: 'Vikram Malhotra',
      costCenter: 'CC-SALES-02',
      jobLevel: 'L3',
      businessUnit: 'Enterprise Growth',
      workMode: 'ONSITE',
    },
  },
  {
    eventId: 'evt-hris-rohan-003',
    eventType: 'employee.created',
    timestamp: '2026-09-26T09:00:00.000Z',
    data: {
      employeeId: 'HR-9923',
      firstName: 'Rohan',
      lastName: 'Gupta',
      workEmail: 'rohan.gupta@onboardflow.demo',
      jobTitle: 'Security Analyst',
      department: 'Information Security',
      location: 'Bengaluru HQ',
      employmentType: 'FULL_TIME',
      startDate: '2026-10-15',
      managerId: 'HR-1009',
      managerName: 'Sam Vance',
      costCenter: 'CC-SEC-01',
      jobLevel: 'L3',
      businessUnit: 'Cyber Defence',
      workMode: 'ONSITE',
    },
  },
];
