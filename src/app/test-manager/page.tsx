"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { TagHeatmap } from '@/components/dashboard/TagHeatmap';
import { DashboardStats } from '@/lib/dashboard/dashboard-service';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  BarChart4, 
  ListChecks,
  Calendar
} from 'lucide-react';

export default function TestManagerPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalTestCases: 0,
    totalExecutions: 0,
    passRate: 0,
    trends: [],
    tagStats: []
  });
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [topFailingTests, setTopFailingTests] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [statsResponse, recentResultsResponse, failingTestsResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/test-results/recent?limit=10'),
          fetch('/api/test-cases/failing?limit=5')
        ]);
        
        // Process responses
        if (!statsResponse.ok) throw new Error('Failed to fetch dashboard stats');
        if (!recentResultsResponse.ok) throw new Error('Failed to fetch recent results');
        if (!failingTestsResponse.ok) throw new Error('Failed to fetch failing tests');
        
        const dashboardStats = await statsResponse.json();
        const recentTestResults = await recentResultsResponse.json();
        const failingTests = await failingTestsResponse.json();
        
        setStats(dashboardStats);
        setRecentResults(recentTestResults);
        setTopFailingTests(failingTests);
        
      } catch (error) {
        console.error("Error loading test manager data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Test Manager</h1>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          title="Test Cases" 
          value={stats.totalTestCases} 
          icon={<ListChecks className="h-5 w-5 text-blue-500" />}
          description="Total test cases" 
        />
        <StatusCard 
          title="Test Executions" 
          value={stats.totalExecutions} 
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
          description="Total test runs" 
        />
        <StatusCard 
          title="Pass Rate" 
          value={`${Math.round(stats.passRate * 100)}%`} 
          icon={<BarChart4 className="h-5 w-5 text-green-500" />}
          description="Overall test success rate" 
          valueClassName={getPassRateColorClass(stats.passRate)}
        />
        <StatusCard 
          title="Active Projects" 
          value={stats.totalProjects} 
          icon={<Clock className="h-5 w-5 text-purple-500" />}
          description="Number of active test projects" 
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Runs</TabsTrigger>
          <TabsTrigger value="failing">Failing Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Trend chart */}
          <TrendChart 
            data={stats.trends} 
            title="Test Results Trend" 
            description="Test outcomes over the last 30 days"
            height={350}
          />
          
          {/* Tag heatmap */}
          <TagHeatmap 
            tags={stats.tagStats} 
            title="Tag Analysis" 
            description="Test case tags colored by pass rate"
          />
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Runs</CardTitle>
              <CardDescription>Most recent test executions across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Test Case</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <TestStatusBadge status={result.status} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${result.testCase?.projectId}/test-cases/${result.testCaseId}`} className="hover:underline">
                          {result.testCase?.name || "Unknown Test"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/${result.testCase?.projectId}`} className="hover:underline">
                          {result.testCase?.project?.name || "Unknown Project"}
                        </Link>
                      </TableCell>
                      <TableCell>{result.executionTime ? `${result.executionTime}ms` : 'N/A'}</TableCell>
                      <TableCell>{formatDate(result.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${result.testCase?.projectId}/test-cases/${result.testCaseId}/results/${result.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="failing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Failing Tests</CardTitle>
              <CardDescription>Tests with the most failures</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Case</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Failure Rate</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFailingTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <Link href={`/projects/${test.projectId}/test-cases/${test.id}`} className="hover:underline">
                          {test.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/${test.projectId}`} className="hover:underline">
                          {test.project?.name || "Unknown Project"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-red-500">
                          {Math.round(test.failureRate * 100)}% Failure
                        </Badge>
                      </TableCell>
                      <TableCell>{test.lastRun ? formatDate(test.lastRun) : 'Never Run'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/projects/${test.projectId}/test-cases/${test.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button variant="default" size="sm" asChild>
                            <Link href={`/projects/${test.projectId}/test-cases/${test.id}/run`}>
                              Run
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  valueClassName?: string;
}

function StatusCard({ title, value, icon, description, valueClassName }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TestStatusBadge({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'passed':
      return (
        <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Passed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'skipped':
      return (
        <Badge variant="outline" className="text-yellow-600 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Skipped
        </Badge>
      );
    case 'blocked':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Blocked
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  }
}

function getPassRateColorClass(rate: number): string {
  if (rate >= 0.9) return 'text-green-600';
  if (rate >= 0.75) return 'text-green-500';
  if (rate >= 0.6) return 'text-yellow-500';
  if (rate >= 0.4) return 'text-yellow-600';
  return 'text-red-500';
} 