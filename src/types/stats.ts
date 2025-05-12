export interface TagStat {
  count: number;
  passed: number;
  total: number;
}

export interface DailyStat {
  passed: number;
  failed: number;
  total: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalTestCases: number;
  totalFixtures: number;
  recentResults: any[]; // Có thể thay bằng TestResult nếu cần
  tagStats?: Record<string, TagStat>;
  dailyStats?: Record<string, DailyStat>;
} 