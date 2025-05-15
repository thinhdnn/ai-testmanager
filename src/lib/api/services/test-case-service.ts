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
    const response = await this.apiClient.get<{ testCase: TestCase }>(
      `/projects/${projectId}/test-cases/${testCaseId}`
    );
    return response.testCase;
  }

  async createTestCase(projectId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    const response = await this.apiClient.post<{ testCase: TestCase }>(
      `/projects/${projectId}/test-cases`,
      testCase
    );
    return response.testCase;
  }

  async updateTestCase(projectId: string, testCaseId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    const response = await this.apiClient.put<{ testCase: TestCase }>(
      `/projects/${projectId}/test-cases/${testCaseId}`,
      testCase
    );
    return response.testCase;
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
    const response = await this.apiClient.get<{ version: TestCaseVersion }>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}`
    );
    return response.version;
  }

  async createTestCaseVersion(projectId: string, testCaseId: string, version: Partial<TestCaseVersion>): Promise<TestCaseVersion> {
    const response = await this.apiClient.post<{ version: TestCaseVersion }>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions`,
      version
    );
    return response.version;
  }

  async getTestResults(projectId: string, testCaseId: string): Promise<TestResult[]> {
    const response = await this.apiClient.get<{ results: TestResult[] }>(
      `/projects/${projectId}/test-cases/${testCaseId}/results`
    );
    return response.results;
  }

  async getTestCaseSteps(projectId: string, testCaseId: string): Promise<Step[]> {
    const response = await this.apiClient.get<{ steps: Step[] }>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps`
    );
    return response.steps;
  }

  async createTestCaseStep(projectId: string, testCaseId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.post<{ step: Step }>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps`,
      step
    );
    return response.step;
  }

  async updateTestCaseStep(projectId: string, testCaseId: string, stepId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.put<{ step: Step }>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`,
      step
    );
    return response.step;
  }

  async deleteTestCaseStep(projectId: string, testCaseId: string, stepId: string): Promise<void> {
    await this.apiClient.delete(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`
    );
  }

  async moveTestCaseStep(projectId: string, testCaseId: string, stepId: string, order: number): Promise<Step> {
    const response = await this.apiClient.post<{ step: Step }>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/reorder`,
      { stepId, newOrder: order }
    );
    return response.step;
  }

  async duplicateTestCaseStep(projectId: string, testCaseId: string, stepId: string): Promise<Step> {
    const response = await this.apiClient.post<{ step: Step }>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/duplicate/${stepId}`,
      {}
    );
    return response.step;
  }

  async revertTestCase(projectId: string, testCaseId: string, versionId: string): Promise<TestCase> {
    const response = await this.apiClient.post<{ testCase: TestCase }>(
      `/projects/${projectId}/test-cases/${testCaseId}/revert/${versionId}`,
      { projectId }
    );
    return response.testCase;
  }

  async cloneTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
    const response = await this.apiClient.post<{ testCase: TestCase }>(
      `/projects/${projectId}/test-cases/${testCaseId}/clone`,
      {}
    );
    return response.testCase;
  }

  async getProjectTags(projectId: string): Promise<any[]> {
    return this.apiClient.get<any[]>(`/projects/${projectId}/tags`);
  }

  async createProjectTag(projectId: string, value: string): Promise<any> {
    return this.apiClient.post<any>(`/projects/${projectId}/tags`, { value });
  }
} 