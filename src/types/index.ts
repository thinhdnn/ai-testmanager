export interface TestCase {
  id: string;
  name: string;
  status: string;
  version: string;
  isManual: boolean;
  tags: string | null;
  updatedAt: string | Date;
  lastRun: string | Date | null;
  createdAt: string | Date;
  projectId: string;
  Steps?: Array<{
    id: string;
    order: number;
    action: string;
    expected: string | null;
    data: string | null;
    disabled: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    testCaseId: string;
  }>;
  _count?: {
    Steps: number;
  };
}

export interface Project {
  id: string;
  name: string;
  url: string;
  description: string | null;
  environment: string;
  playwrightProjectPath: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  lastRunBy?: string | null;
  lastRun?: Date | null;
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
}

export interface CreateProjectRequest {
  name: string;
  url: string;
  description?: string;
  environment?: string;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
} 