import { ApiClient } from '../api-client';
import { TestCase, TestCaseVersion, Step, TestResult } from '../interfaces';

export class TestCaseService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getTestCases(projectId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    tags?: string;
  }): Promise<{ testCases: TestCase[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.tags) searchParams.append('tags', params.tags);

    const response = await this.apiClient.get<{ testCases: TestCase[]; total: number }>(
      `/projects/${projectId}/test-cases?${searchParams.toString()}`
    );
    return response;
  }

  async getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    const response = await this.apiClient.get<TestCase>(
      `/projects/${projectId}/test-cases/${testCaseId}`
    );
    return response;
  }

  async createTestCase(projectId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    try {
      console.log(`[TestCaseService] Creating test case for project ${projectId}:`, testCase);
      const response = await this.apiClient.post<TestCase>(
      `/projects/${projectId}/test-cases`,
      testCase
    );
      console.log('[TestCaseService] Create test case response:', response);
      
      if (!response) {
        throw new Error('Empty response received from API');
      }
      
      if (!response.id) {
        console.error('[TestCaseService] Missing ID in response:', response);
        throw new Error('Invalid response format: missing test case ID');
      }
      
      return response;
    } catch (error) {
      console.error('[TestCaseService] Error creating test case:', error);
      throw error;
    }
  }

  async updateTestCase(projectId: string, testCaseId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    const response = await this.apiClient.put<TestCase>(
      `/projects/${projectId}/test-cases/${testCaseId}`,
      testCase
    );
    return response;
  }

  async deleteTestCase(projectId: string, testCaseId: string): Promise<void> {
    await this.apiClient.delete(
      `/projects/${projectId}/test-cases/${testCaseId}`
    );
  }

  async getTestCaseVersions(projectId: string, testCaseId: string): Promise<TestCaseVersion[]> {
    const response = await this.apiClient.get<{ versions: TestCaseVersion[] }>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions`
    );
    return response.versions;
  }

  async getTestCaseVersion(projectId: string, testCaseId: string, versionId: string): Promise<TestCaseVersion> {
    const response = await this.apiClient.get<TestCaseVersion>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}`
    );
    return response;
  }

  async createTestCaseVersion(projectId: string, testCaseId: string, version: Partial<TestCaseVersion>): Promise<TestCaseVersion> {
    const response = await this.apiClient.post<TestCaseVersion>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions`,
      version
    );
    return response;
  }

  async getTestResults(projectId: string, testCaseId: string): Promise<TestResult[]> {
    const response = await this.apiClient.get<TestResult[]>(
      `/projects/${projectId}/test-cases/${testCaseId}/results`
    );
    return response;
  }

  async getTestCaseSteps(projectId: string, testCaseId: string): Promise<Step[]> {
    const response = await this.apiClient.get<Step[]>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps`
    );
    return response;
  }

  async createTestCaseStep(projectId: string, testCaseId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps`,
      step
    );
    return response;
  }

  async updateTestCaseStep(projectId: string, testCaseId: string, stepId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.put<Step>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`,
      step
    );
    return response;
  }

  async deleteTestCaseStep(projectId: string, testCaseId: string, stepId: string): Promise<void> {
    await this.apiClient.delete(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`
    );
  }

  async moveTestCaseStep(projectId: string, testCaseId: string, stepId: string, order: number): Promise<Step> {
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/reorder`,
      { stepId, newOrder: order }
    );
    return response;
  }

  async duplicateTestCaseStep(projectId: string, testCaseId: string, stepId: string): Promise<Step> {
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/duplicate/${stepId}`,
      {}
    );
    return response;
  }

  async revertTestCase(projectId: string, testCaseId: string, versionId: string): Promise<TestCase> {
    const response = await this.apiClient.post<TestCase>(
      `/projects/${projectId}/test-cases/${testCaseId}/revert/${versionId}`,
      { projectId }
    );
    return response;
  }

  async cloneTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    const response = await this.apiClient.post<TestCase>(
      `/projects/${projectId}/test-cases/${testCaseId}/clone`,
      {}
    );
    return response;
  }

  async getProjectTags(projectId: string): Promise<any[]> {
    return this.apiClient.get<any[]>(`/projects/${projectId}/tags`);
  }

  async createProjectTag(projectId: string, value: string): Promise<any> {
    return this.apiClient.post<any>(`/projects/${projectId}/tags`, { value });
  }
} 