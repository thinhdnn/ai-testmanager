import { ApiClient } from '../api-client';
import type { DashboardStats } from '@/lib/dashboard/dashboard-service';
import { TestResult } from '../interfaces';

export class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    return ApiClient.getInstance().get<DashboardStats>('dashboard/stats');
  }

  async getRecentTestResults(limit: number = 10): Promise<TestResult[]> {
    return ApiClient.getInstance().get<TestResult[]>(`test-results/recent?limit=${limit}`);
  }
} 