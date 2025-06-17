import { Release } from '@prisma/client';
import { ApiClient } from '../api-client';

export interface ReleaseListParams {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReleaseListResponse {
  releases: (Release & { testCaseCount: number })[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateReleaseData {
  name: string;
  version: string;
  description?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status?: string;
}

export interface UpdateReleaseData extends Partial<CreateReleaseData> {}

export class ReleaseService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getReleases(projectId: string, params?: ReleaseListParams) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, value.toString());
        }
      });
    }

    const query = queryParams.toString();
    const url = `/projects/${projectId}/releases${query ? `?${query}` : ''}`;
    return this.apiClient.get<ReleaseListResponse>(url);
  }

  async getRelease(projectId: string, releaseId: string) {
    return this.apiClient.get<Release>(`/projects/${projectId}/releases/${releaseId}`);
  }

  async createRelease(projectId: string, data: CreateReleaseData) {
    return this.apiClient.post<Release>(`/projects/${projectId}/releases`, data);
  }

  async updateRelease(projectId: string, releaseId: string, data: UpdateReleaseData) {
    return this.apiClient.put<Release>(`/projects/${projectId}/releases/${releaseId}`, data);
  }

  async deleteRelease(projectId: string, releaseId: string) {
    return this.apiClient.delete<void>(`/projects/${projectId}/releases/${releaseId}`);
  }

  async getReleaseTestCases(projectId: string, releaseId: string) {
    return this.apiClient.get<any[]>(`/projects/${projectId}/releases/${releaseId}/test-cases`);
  }

  async addTestCasesToRelease(projectId: string, releaseId: string, testCaseIds: string[]) {
    return this.apiClient.post<any[]>(`/projects/${projectId}/releases/${releaseId}/test-cases`, {
      testCaseIds
    });
  }

  async removeTestCaseFromRelease(projectId: string, releaseId: string, testCaseId: string) {
    return this.apiClient.delete<void>(
      `/projects/${projectId}/releases/${releaseId}/test-cases/${testCaseId}`
    );
  }
} 