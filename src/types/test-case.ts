import { PaginationData } from './project';

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  title?: string;
  description?: string;
  status: string;
  priority: string;
  version: number;
  isManual: boolean;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string;
  updatedBy?: string;
  lastRun?: string | Date | null;
  Steps?: TestCaseStep[];
  _count?: {
    Steps: number;
  };
}

export interface TestCaseStep {
  id: string;
  order: number;
  action: string;
  expected: string | null;
  data: string | null;
  disabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  testCaseId: string;
  parentId?: string;
  type?: string;
  selector?: string;
  value?: string;
  fixtureId?: string;
  playwrightScript?: string;
}

export interface TestCaseVersion {
  id: string;
  testCaseId: string;
  name: string;
  version: number;
  changes?: string;
  createdAt: string | Date;
  createdBy?: string;
  stepVersions?: StepVersion[];
}

export interface StepVersion {
  id: string;
  stepId: string;
  type?: string;
  action: string;
  data?: string | null;
  expected?: string | null;
  order: number;
  disabled?: boolean;
  testCaseVersionId?: string;
  createdAt: string | Date;
  selector?: string;
  value?: string;
  version?: number;
}

export interface TestResult {
  id: string;
  testCaseId: string;
  status: string;
  success: boolean;
  executionTime: number | null;
  createdAt: string | Date;
  error?: string;
  screenshot?: string;
  video?: string;
  createdBy?: string;
}

export interface TestCaseFormValues {
  name: string;
  status: string;
  priority: string;
  description: string;
  tags: string[];
  isManual: boolean;
}

export interface TestCasesResponse {
  testCases: TestCase[];
  pagination: PaginationData;
} 