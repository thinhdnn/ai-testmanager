import { ApiClient } from '../api-client';
import { TestCase, TestCaseVersion, Step, TestResult } from '../interfaces';

interface RunTestRequest {
  command: string;
  mode: 'file' | 'list' | 'project';
  testCaseId?: string | null;
  testCaseIds?: string[];
  browser: string;
  headless: boolean;
  config: any;
  testFilePath: string;
  useReadableNames?: boolean;
  waitForResult?: boolean;
}

interface RunTestResponse {
  message: string;
  testResultId: string;
  result?: TestResult;
}

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

  async getTestResult(projectId: string, resultId: string): Promise<TestResult> {
    console.log(`Fetching test result for ID: ${resultId}`);
    const response = await this.apiClient.get<TestResult>(
      `/projects/${projectId}/test-results/${resultId}`
    );
    console.log(`Raw API response for test result:`, response);
    
    // Ensure output is preserved
    const result: TestResult = {
      ...response,
      // Make sure output is included even if it's not in the response
      output: response.output || undefined
    };
    
    console.log(`Processed test result in service:`, result);
    return result;
  }

  async runTest(projectId: string, request: RunTestRequest): Promise<RunTestResponse> {
    const response = await fetch(`/api/projects/${projectId}/run-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to run test');
    }

    return response.json();
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
    // Get all steps first to determine the new order
    const steps = await this.getTestCaseSteps(projectId, testCaseId);
    
    // Sort steps by current order
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    
    // Create new array with the moved step at the desired position
    const stepIds = sortedSteps
      .filter(step => step.id !== stepId) // Remove the step being moved
      .map(step => step.id); // Get IDs of remaining steps
    
    // Insert the moved step at the new position
    stepIds.splice(order, 0, stepId);
    
    // Send the reordered array of step IDs
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/test-cases/${testCaseId}/steps/reorder`,
      { stepIds }
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
    try {
      console.log(`[TestCaseService] Cloning test case ${testCaseId} in project ${projectId}`);
      const response = await this.apiClient.post<any>(
        `/projects/${projectId}/test-cases/${testCaseId}/clone`,
        {}
      );
      
      console.log('[TestCaseService] Clone response:', response);
      
      if (!response) {
        console.error('[TestCaseService] Empty response received from API');
        throw new Error('Empty response received from API');
      }
      
      if (!response.testCase && !response.id) {
        console.error('[TestCaseService] Invalid response format:', response);
        throw new Error('Invalid response format from clone API');
      }
      
      // Handle both response formats - direct object or nested in testCase property
      const testCase = response.testCase || response;
      
      if (!testCase.id) {
        console.error('[TestCaseService] Missing ID in response:', testCase);
        throw new Error('Invalid response: missing test case ID');
      }
      
      return testCase as TestCase;
    } catch (error) {
      console.error('[TestCaseService] Clone error:', error);
      throw error;
    }
  }

  async getTestCaseVersionSteps(projectId: string, testCaseId: string, versionId: string): Promise<any[]> {
    const response = await this.apiClient.get<any[]>(
      `/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}/steps`
    );
    return response;
  }

  async getProjectTags(projectId: string): Promise<any[]> {
    return this.apiClient.get<any[]>(`/projects/${projectId}/tags`);
  }

  async createProjectTag(projectId: string, value: string): Promise<any> {
    return this.apiClient.post<any>(`/projects/${projectId}/tags`, { value });
  }

  async getTestFileContent(projectId: string, testCaseId: string): Promise<string> {
    const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/file`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch test file content');
    }

    const data = await response.json();
    return data.content;
  }
} 