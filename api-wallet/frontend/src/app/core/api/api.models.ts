export type OnboardingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type StepStatus = 'COMPLETED' | 'CURRENT' | 'PENDING';
export type WalletState = 'NO_WALLET' | 'ONBOARDING_IN_PROGRESS' | 'ACTIVE';

export interface StepView {
  code: string;
  title: string;
  status: StepStatus;
}

export interface Onboarding {
  id: string;
  status: OnboardingStatus;
  stepNumber: number;
  totalSteps: number;
  currentStep?: string;
  instruction?: string;
  nextStepLabel?: string;
  steps: StepView[];
  walletActive: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: FieldError[];
  currentStep?: string;
  walletState?: WalletState;
}

export type StepValues = Record<string, string>;

export interface PaymentsAccess {
  enabled: boolean;
}
