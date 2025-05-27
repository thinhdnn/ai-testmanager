import { ApiClient } from '../api-client';
import { Fixture, FixtureVersion, Step } from '../interfaces';

export class FixtureService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getFixtures(projectId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    tags?: string;
  }): Promise<{ fixtures: Fixture[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.tags) searchParams.append('tags', params.tags);

    const response = await this.apiClient.get<{ fixtures: Fixture[]; total: number }>(
      `/projects/${projectId}/fixtures?${searchParams.toString()}`
    );
    return response;
  }

  async getFixture(projectId: string, fixtureId: string): Promise<Fixture> {
    const response = await this.apiClient.get<Fixture>(
      `/projects/${projectId}/fixtures/${fixtureId}`
    );
    return response;
  }

  async createFixture(projectId: string, fixture: Partial<Fixture>): Promise<Fixture> {
    // Ensure type is one of the expected values
    const data = { ...fixture };
    
    // Make the request
    const response = await this.apiClient.post<Fixture>(
      `/projects/${projectId}/fixtures`,
      data
    );
    return response;
  }

  async updateFixture(projectId: string, fixtureId: string, fixture: Partial<Fixture>): Promise<Fixture> {
    // Ensure type is one of the expected values
    const data = { ...fixture };
    
    const response = await this.apiClient.put<Fixture>(
      `/projects/${projectId}/fixtures/${fixtureId}`,
      data
    );
    return response;
  }

  async deleteFixture(projectId: string, fixtureId: string): Promise<void> {
    await this.apiClient.delete(
      `/projects/${projectId}/fixtures/${fixtureId}`
    );
  }

  async getFixtureVersions(projectId: string, fixtureId: string): Promise<FixtureVersion[]> {
    return this.apiClient.get<FixtureVersion[]>(`/projects/${projectId}/fixtures/${fixtureId}/versions`);
  }

  async getFixtureSteps(projectId: string, fixtureId: string): Promise<Step[]> {
    const response = await this.apiClient.get<Step[]>(
      `/projects/${projectId}/fixtures/${fixtureId}/steps`
    );
    return response;
  }

  async createFixtureStep(projectId: string, fixtureId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/fixtures/${fixtureId}/steps`,
      step
    );
    return response;
  }

  async updateFixtureStep(projectId: string, fixtureId: string, stepId: string, step: Partial<Step>): Promise<Step> {
    const response = await this.apiClient.put<Step>(
      `/projects/${projectId}/fixtures/${fixtureId}/steps/${stepId}`,
      step
    );
    return response;
  }

  async deleteFixtureStep(projectId: string, fixtureId: string, stepId: string): Promise<void> {
    await this.apiClient.delete(
      `/projects/${projectId}/fixtures/${fixtureId}/steps/${stepId}`
    );
  }

  async moveFixtureStep(projectId: string, fixtureId: string, stepId: string, order: number): Promise<Step> {
    // Get all steps first to determine the new order
    const steps = await this.getFixtureSteps(projectId, fixtureId);
    
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
      `/projects/${projectId}/fixtures/${fixtureId}/steps/reorder`,
      { stepIds }
    );
    return response;
  }

  async duplicateFixtureStep(projectId: string, fixtureId: string, stepId: string): Promise<Step> {
    const response = await this.apiClient.post<Step>(
      `/projects/${projectId}/fixtures/${fixtureId}/steps/duplicate/${stepId}`,
      {}
    );
    return response;
  }

  async cloneFixture(projectId: string, fixtureId: string): Promise<Fixture> {
    try {
      console.log(`[FixtureService] Cloning fixture: ${fixtureId} in project: ${projectId}`);
      const response = await this.apiClient.post<Fixture>(
        `/projects/${projectId}/fixtures/${fixtureId}/clone`,
        {}
      );
      
      // Log response để debug
      console.log(`[FixtureService] Clone response:`, response);
      
      // Kiểm tra xem response có đúng format không
      if (!response || !response.id) {
        console.error('[FixtureService] Invalid clone response format:', response);
        throw new Error('Invalid response format from clone API');
      }
      
      return response;
    } catch (error) {
      console.error('[FixtureService] Clone error:', error);
      throw error;
    }
  }

  async getFixtureVersionSteps(projectId: string, fixtureId: string, versionId: string): Promise<Step[]> {
    const response = await this.apiClient.get<Step[]>(
      `/projects/${projectId}/fixtures/${fixtureId}/versions/${versionId}/steps`
    );
    return response;
  }

  async revertFixtureToVersion(projectId: string, fixtureId: string, versionId: string): Promise<void> {
    await this.apiClient.post(
      `/projects/${projectId}/fixtures/${fixtureId}/revert/${versionId}`,
      {}
    );
  }
} 