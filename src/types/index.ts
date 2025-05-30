// Export all interfaces from specialized files
export * from './project';
export * from './test-case';
export * from './stats';

// Import types for reference
import { Project } from './project';

// Keep interfaces that aren't in other files yet
export interface CreateProjectRequest {
  name: string;
  baseURL: string;
  description?: string;
  environment?: string;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface TestResult {
  id: string;
  projectId: string;
  success: boolean;
  status: string;
  executionTime: number | null;
  output: string | null;
  errorMessage: string | null;
  resultData: string | null;
  createdAt: string | Date;
  browser: string | null;
  videoUrl: string | null;
  screenshot?: string | null;
  testCases?: Array<{
    testCase: {
      id: string;
      name: string;
    };
  }>;
}

export interface TestCaseExecution {
  id: string;
  testResultId: string;
  testCaseId: string;
  status: string;
  duration?: number;
  errorMessage?: string;
  output?: string;
  startTime?: string;
  endTime?: string;
  retries: number;
  createdAt: string;
  testCase: {
    id: string;
    name: string;
    tags?: string;
  };
}

export interface TestResultHistory {
  id: string;
  projectId: string;
  success: boolean;
  status: string;
  executionTime?: number;
  output?: string;
  errorMessage?: string;
  resultData?: string;
  createdAt: string;
  createdBy?: string;
  lastRunBy?: string;
  browser?: string;
  videoUrl?: string;
  testCaseExecutions: TestCaseExecution[];
}

export interface FixturePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
  }>;
}

export interface EditTestCasePageProps {
  params: Promise<{
    id: string;
    testCaseId: string;
  }>;
}

export interface PageProps {
  params: Promise<any>;
  searchParams: Promise<any>;
} 