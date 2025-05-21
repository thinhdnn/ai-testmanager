export interface Project {
  id: string;
  name: string;
  description?: string | null;
  environment?: string;
  playwrightProjectPath?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  lastRunBy?: string | null;
  lastRun?: Date | null;
}

export interface UIProject {
  id: string;
  name: string;
  url?: string;
  description: string | null;
  environment: string;
  updatedAt?: string;
  testCases?: any[];
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: PaginationData;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectConfigFormProps {
  projectId: string;
}

export interface ConfigurationSettings {
  playwright?: {
    timeout?: string;
    expectTimeout?: string;
    retries?: string;
    workers?: string;
    fullyParallel?: string;
  };
  browser?: {
    baseURL?: string;
    headless?: string;
    'viewport.width'?: string;
    'viewport.height'?: string;
    locale?: string;
    timezoneId?: string;
    video?: string;
    screenshot?: string;
    trace?: string;
  };
} 