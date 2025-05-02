"use client";

import React, { useState, useEffect } from 'react';
import { TrendChart } from '../dashboard/TrendChart';
import { TagHeatmap } from '../dashboard/TagHeatmap';
import { DashboardService, ProjectStats, TestResultTrend, TagStats } from '@/lib/dashboard/dashboard-service';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ProjectAnalyticsProps {
  projectId: string;
}

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats>({
    totalTestCases: 0,
    totalExecutions: 0,
    passRate: 0,
    trends: [] as TestResultTrend[],
    tagStats: [] as TagStats[]
  });

  useEffect(() => {
    const loadProjectAnalytics = async () => {
      try {
        setLoading(true);
        
        const projectStats = await DashboardService.getProjectStats(projectId);
        setStats(projectStats);
      } catch (error) {
        console.error("Error loading project analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectAnalytics();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Test Cases" 
          value={stats.totalTestCases.toString()} 
          description="Total test cases in this project" 
        />
        <StatCard 
          title="Test Executions" 
          value={stats.totalExecutions.toString()} 
          description="Total test runs" 
        />
        <StatCard 
          title="Pass Rate" 
          value={`${Math.round(stats.passRate * 100)}%`}
          description="Overall test success rate" 
          valueClassName={getPassRateColorClass(stats.passRate)}
        />
      </div>
      
      {/* Trend chart */}
      <div>
        <TrendChart 
          data={stats.trends} 
          title="Project Test Results Trend" 
          description="Test outcomes over the last 30 days"
          height={300}
        />
      </div>
      
      {/* Tag heatmap */}
      <div>
        <TagHeatmap 
          tags={stats.tagStats} 
          title="Project Tag Usage & Pass Rate" 
          description="Test case tags colored by pass rate"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  valueClassName?: string;
}

function StatCard({ title, value, description, valueClassName }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getPassRateColorClass(rate: number): string {
  if (rate >= 0.9) return 'text-green-600';
  if (rate >= 0.75) return 'text-green-500';
  if (rate >= 0.6) return 'text-yellow-500';
  if (rate >= 0.4) return 'text-yellow-600';
  return 'text-red-500';
} 