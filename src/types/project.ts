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

export interface ConfigurationSettings {
  [category: string]: {
    [key: string]: string;
  };
} 