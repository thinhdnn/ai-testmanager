export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  environment: string;
  playwrightProjectPath: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  version: number;
  isManual: boolean;
  tags: string[];
  testFilePath?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TestCaseVersion {
  id: string;
  testCaseId: string;
  name: string;
  version: number;
  changes: string;
  createdAt: string;
  createdBy: string;
}

export interface Fixture {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  exportName: string;
  type: string;
  filename: string;
  fixtureFilePath: string;
  playwrightScript: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface FixtureVersion {
  id: string;
  fixtureId: string;
  name: string;
  description?: string;
  content: string;
  playwrightScript: string;
  version: number;
  changes: string;
  createdAt: string;
  createdBy: string;
}

export interface Step {
  id: string;
  parentId: string;
  type: string;
  action: string;
  selector?: string;
  value?: string;
  data?: string;
  expected?: string;
  order: number;
  disabled?: boolean;
  fixtureId?: string;
  testCaseId?: string;
  playwrightScript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StepVersion {
  id: string;
  stepId: string;
  type: string;
  action: string;
  selector?: string;
  value?: string;
  order: number;
  version: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  testCaseId: string;
  projectId: string;
  status: string;
  success: boolean;
  executionTime: number;
  error?: string;
  errorMessage?: string;
  output?: string;
  resultData?: string;
  videoUrl?: string;
  screenshot?: string;
  browser?: string;
  createdAt: string;
  createdBy: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalTestCases: number;
  totalFixtures: number;
  recentResults: TestResult[];
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: PaginationData;
}

export interface TestCasesResponse {
  testCases: TestCase[];
  pagination: PaginationData;
}

export interface FixturesResponse {
  fixtures: Fixture[];
  pagination: PaginationData;
} 