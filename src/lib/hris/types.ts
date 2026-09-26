import { CanonicalEmployee, OnboardingStatus } from '@/lib/types/models';

export interface CanonicalHRISEvent {
  eventId: string;
  eventType: 'employee.created' | 'employee.updated';
  timestamp: string;
  employee: CanonicalEmployee;
}

export interface HRISConnector {
  provider: string;
  verifyInboundRequest?(request: Request): Promise<boolean>;
  normalizeInboundEvent(payload: unknown): Promise<CanonicalHRISEvent>;
  getEmployee?(externalEmployeeId: string): Promise<CanonicalEmployee | null>;
  syncOnboardingStatus?(
    externalEmployeeId: string,
    status: OnboardingStatus
  ): Promise<void>;
}
