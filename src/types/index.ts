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
  testCaseId: string | null;
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