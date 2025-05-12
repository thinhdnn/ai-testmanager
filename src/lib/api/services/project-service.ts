import { ApiClient } from '../api-client';
import { Project, ProjectListResponse } from '../interfaces';
import { getProjectApiUrl } from '@/lib/api-utils';

const apiClient = ApiClient.getInstance();

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

export class ProjectService {
  async getProjects(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ProjectListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);

    const url = `/projects?${searchParams.toString()}`;
    return apiClient.get<ProjectListResponse>(url);
  }

  async getProject(projectId: string): Promise<Project> {
    return apiClient.get<Project>(`/projects/${projectId}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    environment?: string;
    baseURL: string;
  }): Promise<Project> {
    return apiClient.post<Project>('/projects', data);
  }

  async updateProject(
    projectId: string,
    data: Partial<Project>
  ): Promise<Project> {
    return apiClient.put<Project>(`/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    return apiClient.delete(`/projects/${projectId}`);
  }

  async getProjectConfiguration(projectId: string): Promise<ConfigurationSettings> {
    return apiClient.get<ConfigurationSettings>(`/projects/${projectId}/configuration`);
  }

  async updateProjectConfiguration(projectId: string, config: ConfigurationSettings): Promise<void> {
    return apiClient.put<void>(`/projects/${projectId}/configuration`, config);
  }
} 