import { Release } from '@prisma/client';
import { ApiClient } from '../api-client';

export class ReleaseService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getReleases() {
    return this.apiClient.get<Release[]>('/releases');
  }

  async getRelease(id: string) {
    return this.apiClient.get<Release>(`/releases/${id}`);
  }

  async createRelease(data: Partial<Release>) {
    return this.apiClient.post<Release>('/releases', data);
  }

  async runTests(releaseId: string) {
    return this.apiClient.post<any>(`/releases/${releaseId}/run-tests`, {});
  }
} 