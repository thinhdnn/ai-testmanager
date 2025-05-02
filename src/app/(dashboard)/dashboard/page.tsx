"use client";

import React, { useState, useEffect } from 'react';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TagHeatmap } from '@/components/dashboard/TagHeatmap';
import { DashboardService, DashboardStats } from '@/lib/dashboard/dashboard-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CheckCircle2, Layers3, PlaySquare } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalTestCases: 0,
    totalExecutions: 0,
    passRate: 0,
    trends: [],
    tagStats: []
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardStats = await DashboardService.getDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your test projects and execution metrics</p>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Projects" 
          value={stats.totalProjects.toString()} 
          description="Active test projects" 
          icon={<Layers3 className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard 
          title="Test Cases" 
          value={stats.totalTestCases.toString()} 
          description="Defined test cases" 
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard 
          title="Test Executions" 
          value={stats.totalExecutions.toString()} 
          description="Total test runs" 
          icon={<PlaySquare className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard 
          title="Pass Rate" 
          value={`${Math.round(stats.passRate * 100)}%`}
          description="Overall success rate" 
          valueClassName={getPassRateColorClass(stats.passRate)}
          icon={<CheckCircle2 className={`h-5 w-5 ${getPassRateIconColorClass(stats.passRate)}`} />}
        />
      </div>
      
      {/* Main dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend chart - takes 2/3 width on larger screens */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium">Test Results Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Test outcomes over the last 30 days</p>
            </CardHeader>
            <CardContent>
              <TrendChart 
                data={stats.trends}
                title="Test Results Trend" 
                description="Test outcomes over the last 30 days"
                height={350}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Tag heatmap - takes 1/3 width on larger screens */}
        <div>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium">Tag Usage & Pass Rate</CardTitle>
              <p className="text-sm text-muted-foreground">Test case tags colored by pass rate</p>
            </CardHeader>
            <CardContent>
              <TagHeatmap 
                tags={stats.tagStats}
                title="Tag Usage & Pass Rate" 
                description="Test case tags colored by pass rate"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}

function StatCard({ title, value, description, valueClassName, icon }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>
          {value}
        </div>
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

function getPassRateIconColorClass(rate: number): string {
  if (rate >= 0.9) return 'text-green-600';
  if (rate >= 0.75) return 'text-green-500';
  if (rate >= 0.6) return 'text-yellow-500';
  if (rate >= 0.4) return 'text-yellow-600';
  return 'text-red-500';
} 