import { PaginationData } from './project';

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  title?: string;
  description?: string;
  status: string;
  priority: string;
  version: number | string;
  isManual: boolean;
  tags: string[] | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string;
  updatedBy?: string;
  lastRun?: string | Date | null;
  steps?: TestCaseStep[];
  _count?: {
    steps: number;
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
  version: number | string;
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
  projectId?: string;
  status: string;
  success: boolean;
  executionTime: number | null;
  createdAt: string | Date;
  error?: string;
  screenshot?: string;
  video?: string;
  createdBy?: string;
  output?: string | null;
  errorMessage?: string | null;
  resultData?: string | null;
  browser?: string | null;
  videoUrl?: string | null;
  testCases?: Array<{
    testCase: {
      id: string;
      name: string;
    };
  }>;
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

export interface TestCaseDetailPageProps {
  params: {
    id: string;
    testCaseId: string;
  };
} 